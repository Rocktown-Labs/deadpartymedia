import { artists, users } from "@dpmedia/db/schema";
import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { requireAuth } from "../../auth";
import type { AppEnv } from "../../bindings";
import { getMusicDb } from "../../db";
export const musicAccountRoutes = new Hono<AppEnv>()
  .get("/session", zValidator("query", z.record(z.string(), z.string())), async (c) => {
    const auth = c.get("auth");
    if (!auth) return c.json(null);
    const db = getMusicDb(c.env);
    const [profile] = await db
      .select({ onboardingComplete: users.onboardingComplete })
      .from(users)
      .where(eq(users.clerkId, auth.userId))
      .limit(1);
    const [artist] = await db
      .select({ slug: artists.slug })
      .from(artists)
      .where(eq(artists.claimedById, auth.userId))
      .limit(1);
    return c.json({
      ...auth,
      onboardingComplete: profile?.onboardingComplete ?? false,
      artistSlug: artist?.slug ?? null,
    });
  })
  .get("/auth/me", zValidator("query", z.record(z.string(), z.string())), (c) => {
    const auth = requireAuth(c);
    return c.json({
      id: auth.userId,
      name: auth.name,
      email: auth.email,
      avatar: auth.image,
      role: auth.roles[0] || "fan",
      roles: auth.roles,
    });
  })
  .get("/onboarding/profile", zValidator("query", z.record(z.string(), z.string())), async (c) => {
    const auth = requireAuth(c),
      db = getMusicDb(c.env);
    const [profile] = await db.select().from(users).where(eq(users.clerkId, auth.userId)).limit(1);
    const [artist] = await db
      .select()
      .from(artists)
      .where(eq(artists.claimedById, auth.userId))
      .limit(1);
    return c.json({
      artist: artist ?? null,
      fan: { name: profile?.firstName || auth.name },
      onboardingComplete: profile?.onboardingComplete ?? false,
      role: auth.roles[0] || "fan",
    });
  })
  .get("/auth/providers", (c) =>
    c.json({ google: !!c.env.GOOGLE_CLIENT_ID && !!c.env.GOOGLE_CLIENT_SECRET }),
  );
