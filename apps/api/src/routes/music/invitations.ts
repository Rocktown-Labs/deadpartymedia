import { createIdentityDatabase } from "@dpmedia/auth";
import { invitation, membership } from "@dpmedia/auth/schema";
import { inviteUserSchema as artsInvitationSchema } from "@dpmedia/contracts";
import { artists, events, musicReleases, posts, users } from "@dpmedia/db/schema";
import { zValidator } from "@hono/zod-validator";
import { and, desc, eq, isNull, or, sql } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { requireAuth, requireRole } from "../../auth";
import type { AppEnv } from "../../bindings";
import { getMusicDb } from "../../db";
import { sendInvitation } from "../../lib/invitations";
const MUSIC_INVITE_ROLES = ["super_admin"] as const;

async function tokenHash(token: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
export const musicInvitationsRoutes = new Hono<AppEnv>()
  .post("/admin/invitations", zValidator("json", artsInvitationSchema), async (c) => {
    const caller = requireRole(c, MUSIC_INVITE_ROLES);
    const data = c.req.valid("json");
    await sendInvitation(c.env, {
      app: "music",
      email: data.email,
      role: data.role,
      invitedBy: caller.userId,
    });
    return c.json({ success: true as const });
  })
  .get("/admin/invitations", zValidator("query", z.record(z.string(), z.string())), async (c) => {
    requireRole(c, MUSIC_INVITE_ROLES);
    const rows = await createIdentityDatabase(c.env.AUTH_DB)
      .select()
      .from(invitation)
      .where(and(eq(invitation.app, "music"), isNull(invitation.acceptedAt)))
      .orderBy(desc(invitation.createdAt));
    return c.json({
      total: rows.length,
      invitations: rows.map((row) => ({
        id: row.id,
        emailAddress: row.email,
        role: row.role,
        status: row.expiresAt > new Date() ? "pending" : "expired",
        createdAt: row.createdAt.getTime(),
      })),
    });
  })
  .post(
    "/invitations/accept",
    zValidator("json", z.object({ token: z.string().min(32).max(256) })),
    async (c) => {
      const caller = requireAuth(c);
      const hash = await tokenHash(c.req.valid("json").token);
      const db = createIdentityDatabase(c.env.AUTH_DB);
      // Membership insert and token consumption share the same D1 transaction.
      // Neither a stale token nor an email mismatch can contribute a new role.
      const eligible = and(
        eq(invitation.app, "music"),
        eq(invitation.tokenHash, hash),
        eq(invitation.email, caller.email.toLowerCase()),
        isNull(invitation.acceptedAt),
        sql`${invitation.expiresAt} > ${Date.now()}`,
      );
      const [record] = await db.select().from(invitation).where(eligible).limit(1);
      if (!record)
        throw new HTTPException(400, {
          message: "Invitation is invalid, expired, already accepted, or belongs to another email",
        });
      const music = getMusicDb(c.env);
      if (record.artistId) {
        const [artist] = await music
          .select()
          .from(artists)
          .where(eq(artists.id, record.artistId))
          .limit(1);
        if (!artist || (artist.claimedById && artist.claimedById !== caller.userId))
          throw new HTTPException(409, { message: "Artist has already been claimed" });
        const reserved = await music
          .update(artists)
          .set({ claimedById: caller.userId })
          .where(
            and(
              eq(artists.id, record.artistId),
              or(isNull(artists.claimedById), eq(artists.claimedById, caller.userId)),
            ),
          )
          .returning({ id: artists.id });
        if (!reserved.length)
          throw new HTTPException(409, { message: "Artist has already been claimed" });
      }
      if (record.localProfileId) {
        const [profile] = await music
          .select()
          .from(users)
          .where(eq(users.id, record.localProfileId))
          .limit(1);
        if (
          !profile ||
          profile.email.toLowerCase() !== caller.email.toLowerCase() ||
          (!profile.clerkId.startsWith("local_placeholder:") &&
            !profile.clerkId.startsWith("wp_placeholder:") &&
            profile.clerkId !== caller.userId)
        )
          throw new HTTPException(409, {
            message: "Invited profile cannot be linked to this account",
          });
        const role = z.enum(["super_admin", "writer", "artist", "venue", "fan"]).parse(record.role);
        // The identity database grants access only after the content database's
        // ownership changes finish. Retrying a failed grant is safe.
        await music.batch([
          music
            .update(posts)
            .set({ authorId: caller.userId })
            .where(eq(posts.authorId, profile.clerkId)),
          music
            .update(events)
            .set({ createdById: caller.userId })
            .where(eq(events.createdById, profile.clerkId)),
          music
            .update(musicReleases)
            .set({ authorId: caller.userId })
            .where(eq(musicReleases.authorId, profile.clerkId)),
          music
            .delete(users)
            .where(
              and(eq(users.clerkId, caller.userId), sql`${users.id} != ${record.localProfileId}`),
            ),
          music
            .update(users)
            .set({
              clerkId: caller.userId,
              role,
              onboardingComplete: role === "writer" || role === "super_admin",
              updatedAt: new Date(),
            })
            .where(eq(users.id, record.localProfileId)),
        ]);
      }
      const results = await db.batch([
        db
          .insert(membership)
          .select(
            sql`SELECT ${caller.userId}, ${invitation.app}, ${invitation.role}, ${invitation.createdAt} FROM ${invitation} WHERE ${eligible}`,
          )
          .onConflictDoNothing(),
        db
          .update(invitation)
          .set({ acceptedAt: new Date() })
          .where(eligible)
          .returning({ id: invitation.id }),
      ]);
      if (!results[1].length)
        throw new HTTPException(400, {
          message: "Invitation is invalid, expired, already accepted, or belongs to another email",
        });
      return c.json({ success: true as const });
    },
  );
