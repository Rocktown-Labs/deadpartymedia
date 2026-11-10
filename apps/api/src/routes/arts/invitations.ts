import { createIdentityDatabase } from "@dpmedia/auth";
import { invitation, membership } from "@dpmedia/auth/schema";
import { zValidator } from "@hono/zod-validator";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { requireAuth, requireRole } from "../../auth";
import type { AppEnv } from "../../bindings";
import { ARTS_ADMIN_ROLES } from "../../lib/arts-roles";
import { artsInvitationSchema } from "../../lib/arts-schemas";

async function tokenHash(token: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
export const artsInvitationsRoutes = new Hono<AppEnv>()
  .post("/admin/invitations", zValidator("json", artsInvitationSchema), async (c) => {
    const caller = requireRole(c, ARTS_ADMIN_ROLES);
    const data = c.req.valid("json");
    const id = crypto.randomUUID();
    const token = `${crypto.randomUUID()}${crypto.randomUUID()}`;
    const db = createIdentityDatabase(c.env.AUTH_DB);
    await db.insert(invitation).values({
      id,
      app: "arts",
      email: data.email.toLowerCase(),
      role: data.role,
      invitedBy: caller.userId,
      tokenHash: await tokenHash(token),
      expiresAt: new Date(Date.now() + 7 * 86400000),
    });
    const url = `${c.env.ARTS_APP_URL.replace(/\/$/, "")}/invitation/${encodeURIComponent(token)}`;
    try {
      await c.env.EMAIL.send({
        from: c.env.MAIL_FROM,
        to: data.email,
        subject: "Your invitation to Dead Party Arts",
        text: `You have been invited to Dead Party Arts as ${data.role}. Accept your invitation: ${url}\nThis invitation expires in seven days.`,
      });
    } catch (error) {
      await db.delete(invitation).where(eq(invitation.id, id));
      throw error;
    }
    return c.json({ success: true as const });
  })
  .get("/admin/invitations", async (c) => {
    requireRole(c, ARTS_ADMIN_ROLES);
    const rows = await createIdentityDatabase(c.env.AUTH_DB)
      .select()
      .from(invitation)
      .where(and(eq(invitation.app, "arts"), isNull(invitation.acceptedAt)))
      .orderBy(desc(invitation.createdAt));
    return c.json(
      rows.map((row) => ({
        id: row.id,
        emailAddress: row.email,
        role: row.role,
        status: row.expiresAt > new Date() ? "pending" : "expired",
        createdAt: row.createdAt.getTime(),
      })),
    );
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
        eq(invitation.app, "arts"),
        eq(invitation.tokenHash, hash),
        eq(invitation.email, caller.email.toLowerCase()),
        isNull(invitation.acceptedAt),
        sql`${invitation.expiresAt} > ${Date.now()}`,
      );
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
