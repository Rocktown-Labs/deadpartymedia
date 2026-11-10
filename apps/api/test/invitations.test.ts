import { env } from "cloudflare:test";
import { beforeAll, describe, expect, it, vi } from "vite-plus/test";
import { and, eq, isNull } from "drizzle-orm";
import { createIdentityDatabase } from "@dpmedia/auth";
import { invitation, membership } from "@dpmedia/auth/schema";
import { artists, posts, users } from "@dpmedia/db/schema";
import { getMusicDb } from "../src/db";
import { hashInvitationToken, sendInvitation } from "../src/lib/invitations";
import type { Bindings } from "../src/bindings";
import { client, grant, signUp, type TestIdentity } from "./helpers";

describe("scoped native invitations", () => {
  let sender: TestIdentity, recipient: TestIdentity, outsider: TestIdentity;
  beforeAll(async () => {
    sender = await signUp("inviter@example.test");
    recipient = await signUp("recipient@example.test");
    outsider = await signUp("outsider@example.test");
    await grant(sender, "music", "super_admin");
  });
  async function invite(
    token: string,
    extra: { artistId?: number; localProfileId?: number; role?: string } = {},
  ) {
    await createIdentityDatabase(env.AUTH_DB)
      .insert(invitation)
      .values({
        id: crypto.randomUUID(),
        app: "music",
        email: recipient.email,
        role: "writer",
        tokenHash: await hashInvitationToken(token),
        invitedBy: sender.userId,
        expiresAt: new Date(Date.now() + 86400000),
        ...extra,
      });
  }
  it("rejects email mismatch without consuming the invitation", async () => {
    const token = "mismatch-" + crypto.randomUUID();
    await invite(token);
    expect(
      (await client(outsider.cookie).music.invitations.accept.$post({ json: { token } })).status,
    ).toBe(400);
    const [row] = await createIdentityDatabase(env.AUTH_DB)
      .select()
      .from(invitation)
      .where(eq(invitation.tokenHash, await hashInvitationToken(token)));
    expect(row?.acceptedAt).toBeNull();
  });
  it("accepts once, grants music access, and retains arts isolation", async () => {
    const token = "valid-" + crypto.randomUUID();
    await invite(token);
    expect(
      (await client(recipient.cookie).music.invitations.accept.$post({ json: { token } })).status,
    ).toBe(200);
    expect(
      (await client(recipient.cookie).music.invitations.accept.$post({ json: { token } })).status,
    ).toBe(400);
    const rows = await createIdentityDatabase(env.AUTH_DB)
      .select()
      .from(membership)
      .where(eq(membership.userId, recipient.userId));
    expect(rows.map((row) => ({ app: row.app, role: row.role }))).toEqual([
      { app: "music", role: "writer" },
    ]);
    expect((await client(recipient.cookie).arts.admin.overview.$get()).status).toBe(403);
  });
  it("reserves only the artist named in an accepted token", async () => {
    const token = "artist-" + crypto.randomUUID(),
      db = getMusicDb(env);
    await db.insert(artists).values({
      id: 301,
      name: "Invited artist",
      slug: "invited-artist",
      genre: "OTHER",
      location: "Arkansas",
      bio: "Bio",
      email: recipient.email,
    });
    await invite(token, { artistId: 301, role: "artist" });
    expect(
      (await client(recipient.cookie).music.invitations.accept.$post({ json: { token } })).status,
    ).toBe(200);
    const [artist] = await db.select().from(artists).where(eq(artists.id, 301));
    expect(artist?.claimedById).toBe(recipient.userId);
  });
  it("links a placeholder author and preserves the local profile id", async () => {
    const token = "author-" + crypto.randomUUID(),
      db = getMusicDb(env);
    await db.insert(users).values({
      id: 401,
      clerkId: "wp_placeholder:review-writer",
      email: recipient.email,
      firstName: "Published",
      lastName: "Writer",
      role: "writer",
      onboardingComplete: true,
    });
    await db.insert(posts).values({
      id: 402,
      title: "A writer's article",
      slug: "placeholder-authored",
      category: "OTHER",
      excerpt: "Excerpt",
      content: "Content",
      authorId: "wp_placeholder:review-writer",
      status: "published",
    });
    await invite(token, { localProfileId: 401 });
    expect(
      (await client(recipient.cookie).music.invitations.accept.$post({ json: { token } })).status,
    ).toBe(200);
    const [profile] = await db.select().from(users).where(eq(users.id, 401)),
      [post] = await db.select().from(posts).where(eq(posts.id, 402));
    expect(profile?.clerkId).toBe(recipient.userId);
    expect(post?.authorId).toBe(recipient.userId);
  });
  it("rejects an expired token", async () => {
    const token = "expired-" + crypto.randomUUID();
    await invite(token);
    await createIdentityDatabase(env.AUTH_DB)
      .update(invitation)
      .set({ expiresAt: new Date(0) })
      .where(eq(invitation.tokenHash, await hashInvitationToken(token)));
    expect(
      (await client(recipient.cookie).music.invitations.accept.$post({ json: { token } })).status,
    ).toBe(400);
  });
  it("replaces pending invitations only within the selected app and returns the new link", async () => {
    const db = createIdentityDatabase(env.AUTH_DB);
    await db.insert(invitation).values({
      id: "other-app-pending",
      app: "arts",
      email: recipient.email,
      role: "fan",
      tokenHash: await hashInvitationToken("other-app-token"),
      invitedBy: sender.userId,
      expiresAt: new Date(Date.now() + 86400000),
    });
    const send = vi.fn(async () => undefined);
    const bindings = { ...env, EMAIL: { send } } as unknown as Bindings;
    const first = await sendInvitation(bindings, {
      app: "music",
      email: recipient.email,
      role: "writer",
      invitedBy: sender.userId,
    });
    const second = await sendInvitation(bindings, {
      app: "music",
      email: recipient.email,
      role: "artist",
      invitedBy: sender.userId,
      artistId: 99,
    });
    expect(first.id).not.toBe(second.id);
    const pending = await db
      .select()
      .from(invitation)
      .where(
        and(
          eq(invitation.email, recipient.email),
          eq(invitation.app, "music"),
          isNull(invitation.acceptedAt),
        ),
      );
    expect(pending).toHaveLength(1);
    expect(pending[0]?.id).toBe(second.id);
    expect(pending[0]?.artistId).toBe(99);
    expect(pending[0]?.tokenHash).toBe(
      await hashInvitationToken(second.url.split("/invitation/")[1]!),
    );
    expect(
      await db.select().from(invitation).where(eq(invitation.id, "other-app-pending")),
    ).toHaveLength(1);
    expect(send).toHaveBeenCalledTimes(2);
  });
  it("retains the pending invitation if replacement delivery fails", async () => {
    const db = createIdentityDatabase(env.AUTH_DB);
    const before = await db
      .select()
      .from(invitation)
      .where(
        and(
          eq(invitation.email, recipient.email),
          eq(invitation.app, "music"),
          isNull(invitation.acceptedAt),
        ),
      );
    const bindings = {
      ...env,
      EMAIL: {
        send: async () => {
          throw new Error("delivery failed");
        },
      },
    } as unknown as Bindings;
    await expect(
      sendInvitation(bindings, {
        app: "music",
        email: recipient.email,
        role: "writer",
        invitedBy: sender.userId,
      }),
    ).rejects.toThrow("delivery failed");
    expect(
      await db
        .select()
        .from(invitation)
        .where(
          and(
            eq(invitation.email, recipient.email),
            eq(invitation.app, "music"),
            isNull(invitation.acceptedAt),
          ),
        ),
    ).toEqual(before);
  });
});
