import { musicReleases } from "@dpmedia/db/schema";
import { zValidator } from "@hono/zod-validator";
import { desc, inArray } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { requireAuth, requireRole } from "../../../auth";
import type { AppEnv } from "../../../bindings";
import { getMusicDb } from "../../../db";
import { hasMusicRole } from "../../../lib/music-access";

export const loadAdminMusicSubmissions = new Hono<AppEnv>().get(
  "/admin/music/submissions",
  zValidator("query", z.record(z.string(), z.string())),
  async (c) => {
    const db = getMusicDb(c.env);
    requireRole(c, ["super_admin", "writer"]);

    const { userId } = requireAuth(c);

    if (!userId) {
      throw new HTTPException(403, { message: "Access denied" });
    }

    const isSuperAdmin = hasMusicRole(c, "super_admin");

    const isWriter = hasMusicRole(c, "writer");

    if (!isSuperAdmin && !isWriter) {
      throw new HTTPException(403, { message: "Access denied" });
    }

    // Fetch all releases submitted by artists
    const rawSubmissions = await db
      .select()
      .from(musicReleases)
      .where(inArray(musicReleases.submissionStatus, ["pending", "approved", "declined"]))
      .orderBy(desc(musicReleases.createdAt));

    const submissions = rawSubmissions.map((r) => ({
      id: r.id,
      title: r.title,
      slug: r.slug,
      artistName: r.artistName,
      releaseType: r.releaseType,
      genre: r.genre,
      releaseDate: r.releaseDate,
      coverArt: r.coverArt,
      audioUrl: r.audioUrl,
      excerpt: r.excerpt,
      spotifyUrl: r.spotifyUrl,
      appleMusicUrl: r.appleMusicUrl,
      bandcampUrl: r.bandcampUrl,
      youtubeUrl: r.youtubeUrl,
      submissionStatus: r.submissionStatus,
      declineReason: r.declineReason,
      createdAt: r.createdAt.toISOString(),
    }));

    const pendingCount = submissions.filter((s) => s.submissionStatus === "pending").length;
    return c.json({ submissions, pendingCount });
  },
);
