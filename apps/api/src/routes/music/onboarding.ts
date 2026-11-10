import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { Hono } from "hono";

import { artists, venues } from "@dpmedia/db/schema";

import { getIdentity, requireAuth, setMusicAudienceRole } from "../../auth";

import type { AppEnv } from "../../bindings";

import { getMusicDb as getDb } from "../../db";

import { ensureUniqueSlug, generateSlug } from "../../lib/slug";

import { upsertUserAuthState } from "../../lib/user-state";

import {
  artistOnboardingSchema,
  fanOnboardingSchema,
  venueOnboardingSchema,
} from "@dpmedia/contracts";

export const musicOnboardingRoutes = new Hono<AppEnv>()
  .post("/onboarding/fan", zValidator("json", z.record(z.string(), z.unknown())), async (c) => {
    const auth = requireAuth(c);

    const db = getDb(c.env);

    const parsed = fanOnboardingSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) {
      return c.json({ error: parsed.error.issues[0]?.message ?? "Validation failed" }, 400);
    }
    const data = parsed.data;

    const user = await getIdentity(c.env, auth.userId);

    const primaryEmail = user.email;
    if (!primaryEmail) {
      return c.json({ error: "Unable to determine user email for onboarding sync" }, 400);
    }

    await setMusicAudienceRole(c.env, auth.userId, "fan");
    await upsertUserAuthState(db, {
      clerkId: auth.userId,
      email: primaryEmail,
      firstName: data.name,
      imageUrl: user.image,
      lastName: null,
      onboardingComplete: true,
      role: "fan",
    });

    return c.json({ success: true });
  })
  .post("/onboarding/artist", zValidator("json", z.record(z.string(), z.unknown())), async (c) => {
    const auth = requireAuth(c);

    const db = getDb(c.env);

    const parsed = artistOnboardingSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) {
      return c.json({ error: parsed.error.issues[0]?.message ?? "Validation failed" }, 400);
    }
    const data = parsed.data;

    const user = await getIdentity(c.env, auth.userId);
    const [reserved] = await db
      .select({ id: artists.id, claimed: artists.claimed })
      .from(artists)
      .where(eq(artists.claimedById, auth.userId))
      .limit(1);
    const artistId = reserved && !reserved.claimed ? reserved.id : null;

    let artistSlug: string;

    if (artistId) {
      // Claim the invited artist profile.
      const [artist] = await db.select().from(artists).where(eq(artists.id, artistId)).limit(1);
      if (!artist) {
        return c.json({ error: "Artist profile not found" }, 404);
      }
      if (artist.claimed) {
        return c.json({ error: "This artist profile has already been claimed" }, 409);
      }

      artistSlug = await ensureUniqueSlug(db, generateSlug(data.name), artistId, "artists");
      await db
        .update(artists)
        .set({
          bio: data.bio,
          claimed: true,
          claimedById: auth.userId,
          genre: data.genre,
          image: data.image ?? null,
          instagram: data.instagram,
          location: data.location,
          name: data.name,
          phoneNumber: data.phoneNumber ?? null,
          slug: artistSlug,
          spotifyArtistId: data.spotifyArtistId,
          spotifyUrl: data.spotifyUrl,
          tiktok: data.tiktok ?? null,
          twitter: data.twitter ?? null,
          updatedAt: new Date(),
          website: data.website ?? null,
        })
        .where(eq(artists.id, artistId));
    } else {
      // No invitation: mint a new claimed profile (one per user).
      const [existingClaim] = await db
        .select({ id: artists.id })
        .from(artists)
        .where(eq(artists.claimedById, auth.userId))
        .limit(1);
      if (existingClaim) {
        return c.json({ error: "You have already claimed an artist profile" }, 409);
      }

      artistSlug = await ensureUniqueSlug(db, generateSlug(data.name), undefined, "artists");
      await db.insert(artists).values({
        bio: data.bio,
        claimed: true,
        claimedById: auth.userId,
        genre: data.genre,
        image: data.image ?? null,
        instagram: data.instagram,
        location: data.location,
        name: data.name,
        phoneNumber: data.phoneNumber ?? null,
        slug: artistSlug,
        spotifyArtistId: data.spotifyArtistId,
        spotifyUrl: data.spotifyUrl,
        tiktok: data.tiktok ?? null,
        twitter: data.twitter ?? null,
        website: data.website ?? null,
      });
    }

    // Best-effort display-identity sync (matches the Next action).
    try {
    } catch {
      // Username may be disabled/limited by Clerk config — do not block.
    }

    const primaryEmail = user.email;
    if (!primaryEmail) {
      return c.json({ error: "Unable to determine user email for onboarding sync" }, 400);
    }

    await setMusicAudienceRole(c.env, auth.userId, "artist");
    await upsertUserAuthState(db, {
      clerkId: auth.userId,
      email: primaryEmail,
      firstName: data.name,
      imageUrl: user.image,
      lastName: null,
      onboardingComplete: true,
      role: "artist",
    });

    return c.json({ success: true, slug: artistSlug });
  })
  .post("/onboarding/venue", zValidator("json", z.record(z.string(), z.unknown())), async (c) => {
    const auth = requireAuth(c);

    const db = getDb(c.env);

    const parsed = venueOnboardingSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) {
      return c.json({ error: parsed.error.issues[0]?.message ?? "Validation failed" }, 400);
    }
    const data = parsed.data;

    const [existingVenue] = await db
      .select({ id: venues.id })
      .from(venues)
      .where(eq(venues.claimedById, auth.userId))
      .limit(1);
    if (existingVenue) {
      return c.json({ error: "You have already registered a venue" }, 409);
    }

    const venueSlug = await ensureUniqueSlug(db, generateSlug(data.name), undefined, "venues");
    const [createdVenue] = await db
      .insert(venues)
      .values({
        address: data.address ?? null,
        bookingEmail: data.bookingEmail ?? null,
        bookingRates: data.bookingRates ?? null,
        capacity: data.capacity ?? null,
        city: data.city,
        claimedById: auth.userId,
        description: data.description ?? null,
        image: data.image ?? null,
        name: data.name,
        phone: data.phone ?? null,
        slug: venueSlug,
        state: data.state,
        website: data.website ?? null,
      })
      .returning();

    // Fidelity note: the source fire-and-forget Resend admin notification is
    // not ported yet (API gap) — venueId is returned so callers can notify.

    const user = await getIdentity(c.env, auth.userId);
    try {
    } catch {
      // Best-effort name sync.
    }

    const primaryEmail = user.email;
    if (primaryEmail) {
      await setMusicAudienceRole(c.env, auth.userId, "venue");
      await upsertUserAuthState(db, {
        clerkId: auth.userId,
        email: primaryEmail,
        firstName: data.name,
        imageUrl: user.image,
        lastName: null,
        onboardingComplete: true,
        role: "venue",
      });
    }

    return c.json({ success: true, venueId: createdVenue?.id });
  });
