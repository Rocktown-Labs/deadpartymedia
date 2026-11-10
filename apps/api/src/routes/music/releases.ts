import { zValidator } from "@hono/zod-validator";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { Hono } from "hono";

import { artists, musicReleases, users } from "@dpmedia/db/schema";

import { getMusicDb as getDb } from "../../db";

import { clampInt } from "../../lib/security";

import type { AppEnv } from "../../bindings";

const RELEASE_GENRES = ["COUNTRY", "EDM", "HARDCORE & ROCK", "HIP-HOP & R&B", "OTHER"] as const;

const RELEASE_TYPES = ["Album", "Single", "EP"] as const;

type ReleaseGenre = (typeof RELEASE_GENRES)[number];

type ReleaseType = (typeof RELEASE_TYPES)[number];

function isReleaseGenre(value: string): value is ReleaseGenre {
  return RELEASE_GENRES.includes(value as ReleaseGenre);
}

function isReleaseType(value: string): value is ReleaseType {
  return RELEASE_TYPES.includes(value as ReleaseType);
}

export const musicReleasesRoutes = new Hono<AppEnv>()
  .get("/", zValidator("query", z.record(z.string(), z.string())), async (c) => {
    try {
      const releaseType = c.req.query("type");
      const genre = c.req.query("genre");
      const limit = clampInt(c.req.query("limit"), 20, 1, 100);
      const offset = clampInt(c.req.query("offset"), 0, 0, 100_000);
      const featured = c.req.query("featured") === "true";

      const db = getDb(c.env);

      const conditions = [eq(musicReleases.status, "published")];
      if (releaseType && isReleaseType(releaseType)) {
        conditions.push(eq(musicReleases.releaseType, releaseType));
      }
      if (genre && isReleaseGenre(genre)) {
        conditions.push(eq(musicReleases.genre, genre));
      }
      if (featured) {
        conditions.push(eq(musicReleases.featured, true));
      }

      const rows = await db
        .select({
          appleMusicUrl: musicReleases.appleMusicUrl,
          artistId: musicReleases.artistId,
          artistName: musicReleases.artistName,
          artistSlug: artists.slug,
          bandcampUrl: musicReleases.bandcampUrl,
          content: musicReleases.content,
          coverArt: musicReleases.coverArt,
          createdAt: musicReleases.createdAt,
          excerpt: musicReleases.excerpt,
          featured: musicReleases.featured,
          genre: musicReleases.genre,
          id: musicReleases.id,
          releaseDate: musicReleases.releaseDate,
          releaseType: musicReleases.releaseType,
          slug: musicReleases.slug,
          spotifyUrl: musicReleases.spotifyUrl,
          title: musicReleases.title,
          youtubeUrl: musicReleases.youtubeUrl,
        })
        .from(musicReleases)
        .leftJoin(artists, eq(musicReleases.artistId, artists.id))
        .where(and(...conditions))
        .orderBy(desc(musicReleases.createdAt))
        .limit(limit)
        .offset(offset);

      return c.json(rows);
    } catch (error) {
      console.error("[api] fetch_music_releases:", error);
      return c.json({ error: "Failed to fetch music releases" }, 500);
    }
  })
  .get("/:slug", zValidator("query", z.record(z.string(), z.string())), async (c) => {
    try {
      const slug = c.req.param("slug");
      const db = getDb(c.env);

      const [release] = await db
        .select({
          appleMusicUrl: musicReleases.appleMusicUrl,
          artistBio: artists.bio,
          artistId: musicReleases.artistId,
          artistImage: artists.image,
          artistName: musicReleases.artistName,
          artistSlug: artists.slug,
          authorEmail: users.email,
          authorFirstName: users.firstName,
          authorId: musicReleases.authorId,
          authorLastName: users.lastName,
          bandcampUrl: musicReleases.bandcampUrl,
          content: musicReleases.content,
          coverArt: musicReleases.coverArt,
          createdAt: musicReleases.createdAt,
          excerpt: musicReleases.excerpt,
          featured: musicReleases.featured,
          genre: musicReleases.genre,
          id: musicReleases.id,
          releaseDate: musicReleases.releaseDate,
          releaseType: musicReleases.releaseType,
          slug: musicReleases.slug,
          spotifyUrl: musicReleases.spotifyUrl,
          status: musicReleases.status,
          title: musicReleases.title,
          updatedAt: musicReleases.updatedAt,
          views: musicReleases.views,
          youtubeUrl: musicReleases.youtubeUrl,
        })
        .from(musicReleases)
        .leftJoin(artists, eq(musicReleases.artistId, artists.id))
        .leftJoin(users, eq(musicReleases.authorId, users.clerkId))
        .where(and(eq(musicReleases.slug, slug), eq(musicReleases.status, "published")))
        .limit(1);

      if (!release) {
        return c.json({ error: "Music release not found" }, 404);
      }

      // Increment view count asynchronously
      const incrementViews = db
        .update(musicReleases)
        .set({ views: sql`${musicReleases.views} + 1` })
        .where(eq(musicReleases.id, release.id))
        .catch((err) => {
          console.error("[api] increment_music_release_views:", err);
        });
      // Keep the write alive after the response is returned (Workers cancels
      // floating tasks); outside Workers the promise simply runs on.
      try {
        c.executionCtx.waitUntil(incrementViews);
      } catch {
        // No ExecutionContext available (e.g. Node tests) — fire-and-forget.
      }

      const authorName =
        [release.authorFirstName, release.authorLastName].filter(Boolean).join(" ").trim() ||
        "Dead Party Media";

      // Never leak authorEmail / Clerk authorId in the public payload.
      const {
        authorEmail: _authorEmail,
        authorFirstName: _authorFirstName,
        authorLastName: _authorLastName,
        authorId: _authorId,
        ...publicRelease
      } = release;

      return c.json({
        ...publicRelease,
        author: {
          name: authorName,
        },
      });
    } catch (error) {
      console.error("[api] fetch_music_release:", error);
      return c.json({ error: "Failed to fetch music release" }, 500);
    }
  });
