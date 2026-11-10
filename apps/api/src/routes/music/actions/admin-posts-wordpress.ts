import { HTTPException } from "hono/http-exception";
import { artists, postImportSources, posts, users } from "@dpmedia/db/schema";
import { zValidator } from "@hono/zod-validator";
import { eq, sql } from "drizzle-orm";
import type { Context } from "hono";
import { Hono } from "hono";
import { z } from "zod";
import { requireRole } from "../../../auth";
import type { AppEnv } from "../../../bindings";
import { getMusicDb } from "../../../db";
import { hasMusicRole } from "../../../lib/music-access";
import {
  normalizeImportSourceUrl,
  normalizeImportTitle,
  parseNameParts,
} from "../../../lib/music/admin/wordpress-backfill";
import { spotifySearch, spotifyToken, wordpressFeed } from "../../../lib/music/provider-schemas";
import { decodeHtmlEntities } from "../../../lib/music/utils/html";
import { createWordPressImportServices } from "../../../lib/music/wordpress-import";
export function AdminPostsWordpressActions(c: Context<AppEnv>) {
  const db = getMusicDb(c.env);

  const backfillAnalysisSchema = z.object({
    category: z.enum(["COUNTRY", "EDM", "HARDCORE & ROCK", "HIP-HOP & R&B", "OTHER"]),
    excerpt: z.string().max(500),
    detectedArtists: z.array(
      z.object({
        name: z.string(),
        genre: z.enum(["COUNTRY", "EDM", "HARDCORE & ROCK", "HIP-HOP & R&B", "OTHER"]),
        location: z.string(),
        bio: z.string(),
      }),
    ),
  });

  async function searchSpotifyArtist(
    query: string,
  ): Promise<{ spotifyArtistId: string; spotifyUrl: string; imageUrl?: string } | null> {
    const clientId = c.env.SPOTIFY_CLIENT_ID;
    const clientSecret = c.env.SPOTIFY_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      return null;
    }
    try {
      const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
        body: new URLSearchParams({
          grant_type: "client_credentials",
        }),
        headers: {
          Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        method: "POST",
        cache: "no-store",
      });
      if (!tokenResponse.ok) {
        return null;
      }
      const tokenData = spotifyToken.parse(await tokenResponse.json());
      const accessToken = tokenData.access_token;

      const searchResponse = await fetch(
        `https://api.spotify.com/v1/search?${new URLSearchParams({
          limit: "1",
          q: query,
          type: "artist",
        })}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          cache: "no-store",
        },
      );
      if (!searchResponse.ok) {
        return null;
      }
      const searchData = spotifySearch.parse(await searchResponse.json());
      const artist = searchData.artists?.items?.[0];
      if (!artist) {
        return null;
      }
      return {
        spotifyArtistId: artist.id,
        spotifyUrl: artist.external_urls?.spotify || `https://open.spotify.com/artist/${artist.id}`,
        imageUrl: artist.images?.[0]?.url,
      };
    } catch (error) {
      console.error("Error searching Spotify in backfill action:", error);
      return null;
    }
  }

  type BackfillAnalysis = z.infer<typeof backfillAnalysisSchema> & {
    artistsMapping: {
      name: string;
      genre: "COUNTRY" | "EDM" | "HARDCORE & ROCK" | "HIP-HOP & R&B" | "OTHER";
      location: string;
      bio: string;
      existingId: number | null;
      spotifyArtistId: string | null;
      spotifyUrl: string | null;
      spotifyImageUrl: string | null;
    }[];
  };

  interface WordPressTagsFeedItem {
    title: string;
    url: string;
    rawTags: string[];
  }

  async function analyzePostInternal(
    title: string,
    contentHtml: string,
  ): Promise<BackfillAnalysis> {
    return createWordPressImportServices(c.env).analyzePostInternal(title, contentHtml);
  }

  async function analyzeWordPressPostAction(
    title: string,
    contentHtml: string,
  ): Promise<BackfillAnalysis> {
    if (!hasMusicRole(c, "super_admin")) {
      throw new HTTPException(403, {
        message: "Unauthorized: Only super admins can run AI analysis",
      });
    }
    return analyzePostInternal(title, contentHtml);
  }

  interface ImportWordPressPostPayload {
    title: string;
    excerpt: string;
    category: "COUNTRY" | "EDM" | "HARDCORE & ROCK" | "HIP-HOP & R&B" | "OTHER";
    contentHtml: string;
    coverImageUrl: string | null;
    authorId: string;
    authorName?: string;
    isCoverStory: boolean;
    sourceUrl: string;
    sourceAuthorSlug: string;
    sourcePublishedAt: string;
    sourceModifiedAt: string | null;
    rawCategories: string[];
    selectedArtistIds: number[];
    newArtistsToCreate: {
      name: string;
      genre: "COUNTRY" | "EDM" | "HARDCORE & ROCK" | "HIP-HOP & R&B" | "OTHER";
      location: string;
      bio: string;
      spotifyUrl?: string | null;
      spotifyArtistId?: string | null;
      image?: string | null;
    }[];
    status?: "draft" | "published";
    tags?: string[];
  }

  async function resolveOrCreateWordPressAuthor(
    tx: any,
    sourceAuthorSlug: string | null | undefined,
    authorName: string | null | undefined,
    fallbackAuthorId = "",
  ): Promise<string> {
    const cleanSlug = sourceAuthorSlug?.trim().toLowerCase();
    const cleanName = authorName?.trim();

    if (!cleanSlug && !cleanName) {
      return fallbackAuthorId;
    }

    const existingUsers = await tx
      .select({
        clerkId: users.clerkId,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(users);

    // 1. Exact clerkId match
    if (cleanSlug) {
      const placeholderClerkId = `wp_placeholder:${cleanSlug}`;
      const matchByClerkId = existingUsers.find(
        (u: any) =>
          u.clerkId === placeholderClerkId ||
          u.clerkId === cleanSlug ||
          u.clerkId.toLowerCase() === `local_placeholder:${cleanSlug}`,
      );
      if (matchByClerkId) {
        return matchByClerkId.clerkId;
      }
    }

    // 2. Name match (case- and whitespace-insensitive)
    if (cleanName) {
      const targetName = normalizeImportTitle(cleanName);
      const matchByName = existingUsers.find((u: any) => {
        const fullName = [u.firstName, u.lastName].filter(Boolean).join(" ");
        return normalizeImportTitle(fullName) === targetName;
      });
      if (matchByName) {
        return matchByName.clerkId;
      }
    }

    // 3. Match slug against email or clerkId suffix
    if (cleanSlug) {
      const matchBySlug = existingUsers.find((u: any) => {
        const emailPrefix = u.email?.split("@")[0]?.toLowerCase();
        const clerkSuffix = u.clerkId?.split(":").pop()?.toLowerCase();
        return emailPrefix === cleanSlug || clerkSuffix === cleanSlug;
      });
      if (matchBySlug) {
        return matchBySlug.clerkId;
      }
    }

    // 4. If writer does not exist on ours, create writer profile in backend
    const slug = cleanSlug || normalizeImportTitle(cleanName || "writer") || "writer";
    const placeholderClerkId = `wp_placeholder:${slug}`;
    const nameParts = parseNameParts(cleanName || slug);
    const placeholderEmail = `${slug}@placeholder.deadpartymedia.local`;

    const [inserted] = await tx
      .insert(users)
      .values({
        clerkId: placeholderClerkId,
        email: placeholderEmail,
        firstName: nameParts.firstName,
        imageUrl: null,
        lastName: nameParts.lastName,
        onboardingComplete: true,
        role: "writer",
      })
      .onConflictDoUpdate({
        target: users.clerkId,
        set: {
          firstName: nameParts.firstName,
          lastName: nameParts.lastName,
          onboardingComplete: true,
          role: "writer",
          updatedAt: new Date(),
        },
      })
      .returning({ clerkId: users.clerkId });

    return inserted?.clerkId || placeholderClerkId;
  }

  async function importPostInternal(payload: ImportWordPressPostPayload) {
    return createWordPressImportServices(c.env).importPostInternal(payload);
  }

  async function importWordPressPostAction(payload: ImportWordPressPostPayload) {
    if (!hasMusicRole(c, "super_admin")) {
      throw new HTTPException(403, { message: "Unauthorized: Only super admins can import posts" });
    }
    return importPostInternal(payload);
  }

  async function syncExistingArtistsSpotifyAction() {
    if (!hasMusicRole(c, "super_admin")) {
      throw new HTTPException(403, { message: "Unauthorized: Only super admins can sync Spotify" });
    }

    // Fetch all artists with missing Spotify ID
    const artistsToSync = await db
      .select({
        id: artists.id,
        name: artists.name,
        image: artists.image,
      })
      .from(artists)
      .where(sql`${artists.spotifyArtistId} IS NULL OR ${artists.spotifyArtistId} = ''`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const artist of artistsToSync) {
      const match = await searchSpotifyArtist(artist.name);
      if (match) {
        await db
          .update(artists)
          .set({
            spotifyArtistId: match.spotifyArtistId,
            spotifyUrl: match.spotifyUrl,
            image: artist.image || match.imageUrl || null,
            updatedAt: new Date(),
          })
          .where(eq(artists.id, artist.id));
        updatedCount++;
      } else {
        skippedCount++;
      }
    }

    return {
      success: true,
      total: artistsToSync.length,
      updatedCount,
      skippedCount,
    };
  }

  async function syncPublishedWordPressTagsAction() {
    if (!hasMusicRole(c, "super_admin")) {
      throw new HTTPException(403, {
        message: "Unauthorized: Only super admins can sync WordPress tags",
      });
    }

    const wordpressPosts = await fetchAllWordPressTags();
    const importedPosts = await db
      .select({
        postId: posts.id,
        slug: posts.slug,
        sourceUrl: postImportSources.sourceUrl,
        status: posts.status,
        tags: posts.tags,
        title: posts.title,
      })
      .from(postImportSources)
      .innerJoin(posts, eq(postImportSources.postId, posts.id));

    const importedByUrl = new Map(
      importedPosts.map((post) => [normalizeImportSourceUrl(post.sourceUrl), post]),
    );
    const importedByTitle = new Map(
      importedPosts.map((post) => [normalizeImportTitle(post.title), post]),
    );

    let matchedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    for (const wordpressPost of wordpressPosts) {
      const importedPost =
        importedByUrl.get(normalizeImportSourceUrl(wordpressPost.url)) ??
        importedByTitle.get(normalizeImportTitle(wordpressPost.title));

      if (!importedPost || importedPost.status !== "published") {
        skippedCount++;
        continue;
      }

      matchedCount++;
      const nextTags = normalizeTags(wordpressPost.rawTags);
      const currentTags = normalizeTags(importedPost.tags ?? []);
      if (sameTags(currentTags, nextTags)) {
        continue;
      }

      await db
        .update(posts)
        .set({
          tags: nextTags,
          updatedAt: new Date(),
        })
        .where(eq(posts.id, importedPost.postId));

      updatedCount++;
    }

    return {
      success: true,
      total: wordpressPosts.length,
      matchedCount,
      updatedCount,
      skippedCount,
    };
  }

  async function fetchAllWordPressTags() {
    const postsWithTags: WordPressTagsFeedItem[] = [];
    const pageSize = 100;
    let offset = 0;
    let found = Number.POSITIVE_INFINITY;

    while (offset < found && offset < 1000) {
      const response = await fetch(
        `https://public-api.wordpress.com/rest/v1.1/sites/deadpartymedia.wordpress.com/posts?number=${pageSize}&offset=${offset}`,
        { cache: "no-store" },
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch WordPress tags: ${response.statusText}`);
      }

      const data = wordpressFeed.parse(await response.json());
      const feedPosts = Array.isArray(data.posts) ? data.posts : [];
      found = typeof data.found === "number" ? data.found : offset + feedPosts.length;

      postsWithTags.push(
        ...feedPosts.map((post: any) => ({
          title: decodeHtmlEntities(post.title || ""),
          url: post.URL || "",
          rawTags: Object.keys(post.tags || {}),
        })),
      );

      if (feedPosts.length === 0) {
        break;
      }

      offset += pageSize;
    }

    return postsWithTags;
  }

  function normalizeTags(tags: string[]) {
    return [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))];
  }

  function sameTags(left: string[], right: string[]) {
    if (left.length !== right.length) {
      return false;
    }

    const sortedLeft = [...left].toSorted();
    const sortedRight = [...right].toSorted();
    return sortedLeft.every((tag, index) => tag === sortedRight[index]);
  }
  return {
    analyzePostInternal,
    analyzeWordPressPostAction,
    resolveOrCreateWordPressAuthor,
    importPostInternal,
    importWordPressPostAction,
    syncExistingArtistsSpotifyAction,
    syncPublishedWordPressTagsAction,
  };
}
export const adminPostsWordpressActionsRoutes = new Hono<AppEnv>()
  .post(
    "/admin/posts/wordpress/analyzeWordPressPostAction",
    zValidator("json", z.object({ title: z.string(), contentHtml: z.string() })),
    async (c) => {
      requireRole(c, ["super_admin", "writer"]);
      const input = c.req.valid("json");
      return c.json(
        (await AdminPostsWordpressActions(c).analyzeWordPressPostAction(
          input.title,
          input.contentHtml,
        )) ?? null,
      );
    },
  )
  .post(
    "/admin/posts/wordpress/importWordPressPostAction",
    zValidator(
      "json",
      z.object({
        payload: z.object({
          title: z.string(),
          excerpt: z.string(),
          category: z.union([
            z.literal("COUNTRY"),
            z.literal("EDM"),
            z.literal("HARDCORE & ROCK"),
            z.literal("HIP-HOP & R&B"),
            z.literal("OTHER"),
          ]),
          contentHtml: z.string(),
          coverImageUrl: z.union([z.string(), z.literal(null)]),
          authorId: z.string(),
          authorName: z.string().optional(),
          isCoverStory: z.boolean(),
          sourceUrl: z.string(),
          sourceAuthorSlug: z.string(),
          sourcePublishedAt: z.string(),
          sourceModifiedAt: z.union([z.string(), z.literal(null)]),
          rawCategories: z.array(z.string()),
          selectedArtistIds: z.array(z.number().int()),
          newArtistsToCreate: z.array(
            z.object({
              name: z.string(),
              genre: z.union([
                z.literal("COUNTRY"),
                z.literal("EDM"),
                z.literal("HARDCORE & ROCK"),
                z.literal("HIP-HOP & R&B"),
                z.literal("OTHER"),
              ]),
              location: z.string(),
              bio: z.string(),
              spotifyUrl: z.union([z.string(), z.literal(null)]).optional(),
              spotifyArtistId: z.union([z.string(), z.literal(null)]).optional(),
              image: z.union([z.string(), z.literal(null)]).optional(),
            }),
          ),
          status: z.union([z.literal("draft"), z.literal("published")]).optional(),
          tags: z.array(z.string()).optional(),
        }),
      }),
    ),
    async (c) => {
      requireRole(c, ["super_admin", "writer"]);
      const input = c.req.valid("json");
      return c.json(
        (await AdminPostsWordpressActions(c).importWordPressPostAction(input.payload)) ?? null,
      );
    },
  )
  .post(
    "/admin/posts/wordpress/syncExistingArtistsSpotifyAction",
    zValidator("json", z.object({})),
    async (c) => {
      requireRole(c, ["super_admin", "writer"]);
      return c.json(
        (await AdminPostsWordpressActions(c).syncExistingArtistsSpotifyAction()) ?? null,
      );
    },
  )
  .post(
    "/admin/posts/wordpress/syncPublishedWordPressTagsAction",
    zValidator("json", z.object({})),
    async (c) => {
      requireRole(c, ["super_admin", "writer"]);
      return c.json(
        (await AdminPostsWordpressActions(c).syncPublishedWordPressTagsAction()) ?? null,
      );
    },
  );
