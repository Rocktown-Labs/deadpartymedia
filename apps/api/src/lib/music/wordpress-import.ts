import { artists, postArtists, postImportSources, posts, users } from "@dpmedia/db/schema";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { generateJSON } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
import { generateObject } from "ai";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import type { Bindings } from "../../bindings";
import { getMusicDb } from "../../db";
import { selectPrimarySubjectArtists } from "./admin/article-subject-artists";
import {
  findMatchingImportSource,
  normalizeImportTitle,
  parseNameParts,
  sanitizeAndTruncateExcerpt,
} from "./admin/wordpress-backfill";
import { getWorkersAiModel } from "./ai";
import { createImageMirror } from "./image-mirror";
import { spotifySearch, spotifyToken } from "./provider-schemas";
export function createWordPressImportServices(env: Bindings) {
  const db = getMusicDb(env);

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
    const clientId = env.SPOTIFY_CLIENT_ID;
    const clientSecret = env.SPOTIFY_CLIENT_SECRET;
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

  function slugify(text: string): string {
    return text
      .toString()
      .toLowerCase()
      .normalize("NFD")
      .replaceAll(/[\u0300-\u036F]/g, "")
      .replaceAll(/[^a-z0-9\s-]/g, "")
      .trim()
      .replaceAll(/\s+/g, "-")
      .replaceAll(/-+/g, "-");
  }

  async function resolveUniqueArtistSlug(name: string): Promise<string> {
    const baseSlug = slugify(name);
    let candidate = baseSlug;
    let suffix = 1;

    while (true) {
      const [existing] = await db
        .select({ id: artists.id })
        .from(artists)
        .where(eq(artists.slug, candidate))
        .limit(1);

      if (!existing) {
        return candidate;
      }
      candidate = `${baseSlug}-${suffix}`;
      suffix += 1;
    }
  }

  async function resolveUniquePostSlug(title: string): Promise<string> {
    const baseSlug = slugify(title);
    let candidate = baseSlug;
    let suffix = 1;

    while (true) {
      const [existing] = await db
        .select({ id: posts.id })
        .from(posts)
        .where(eq(posts.slug, candidate))
        .limit(1);

      if (!existing) {
        return candidate;
      }
      candidate = `${baseSlug}-${suffix}`;
      suffix += 1;
    }
  }

  async function analyzePostInternal(
    title: string,
    contentHtml: string,
  ): Promise<BackfillAnalysis> {
    const model = getWorkersAiModel(env);

    // Strip HTML tags to make the prompt cleaner and save tokens
    const cleanText = contentHtml
      .replaceAll(/<[^>]*>/g, " ")
      .replaceAll(/\s+/g, " ")
      .trim();

    const prompt = `Analyze this WordPress blog post titled "${title}".
Content body excerpt:
${cleanText.slice(0, 4000)}

Perform the following tasks:
1. Classify this post under one of our music categories: COUNTRY, EDM, HARDCORE & ROCK, HIP-HOP & R&B, or OTHER.
2. Generate a concise, engaging summary/excerpt of the post in 2-3 sentences (maximum 400 characters).
3. Identify only the primary subject artist(s), band(s), or DJ(s) the article is about. Prefer artists named in the title, opening paragraph, and final call-to-action. Exclude artists mentioned only as inspirations, comparisons, influences, playlist references, or one-off examples.
4. For each primary subject artist, extract their default music genre matching our categories, their location/hometown if mentioned, and write a brief professionally-written biography (2-4 sentences) that highlights their background.`;

    const { object } = await generateObject({
      model,
      schema: backfillAnalysisSchema,
      prompt,
    });

    const artistsMapping = [];

    const subjectArtists = selectPrimarySubjectArtists(title, contentHtml, object.detectedArtists);

    for (const artist of subjectArtists) {
      // Try to find the artist in the local database by name (case-insensitive)
      const [existingArtist] = await db
        .select({ id: artists.id })
        .from(artists)
        .where(sql`lower(${artists.name}) = ${artist.name.toLowerCase()}`)
        .limit(1);

      const spotifyMatch = await searchSpotifyArtist(artist.name);

      artistsMapping.push({
        ...artist,
        existingId: existingArtist?.id ?? null,
        spotifyArtistId: spotifyMatch?.spotifyArtistId ?? null,
        spotifyUrl: spotifyMatch?.spotifyUrl ?? null,
        spotifyImageUrl: spotifyMatch?.imageUrl ?? null,
      });
    }

    return {
      ...object,
      excerpt: sanitizeAndTruncateExcerpt(object.excerpt, 500),
      artistsMapping,
    };
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
    const {
      title,
      excerpt,
      category,
      contentHtml,
      coverImageUrl,
      authorId,
      authorName,
      isCoverStory,
      sourceUrl,
      sourceAuthorSlug,
      sourcePublishedAt,
      sourceModifiedAt,
      rawCategories,
      selectedArtistIds,
      newArtistsToCreate,
      status = "draft",
      tags = [],
    } = payload;
    const publishedDate = new Date(sourcePublishedAt),
      modifiedDate = sourceModifiedAt ? new Date(sourceModifiedAt) : publishedDate;
    if (!Number.isFinite(publishedDate.getTime()) || !Number.isFinite(modifiedDate.getTime()))
      throw new Error("Invalid source date");
    const resolvedAuthorId = await resolveOrCreateWordPressAuthor(
      db,
      sourceAuthorSlug,
      authorName,
      authorId,
    );
    const artistIds = new Set(selectedArtistIds);
    for (const incoming of newArtistsToCreate) {
      const [existing] = await db
        .select({ id: artists.id })
        .from(artists)
        .where(sql`lower(${artists.name}) = ${incoming.name.toLowerCase()}`)
        .limit(1);
      if (existing) {
        artistIds.add(existing.id);
        continue;
      }
      const [created] = await db
        .insert(artists)
        .values({
          name: incoming.name,
          slug: await resolveUniqueArtistSlug(incoming.name),
          genre: incoming.genre,
          location: incoming.location || "Arkansas",
          bio: incoming.bio,
          claimed: false,
          spotifyUrl: incoming.spotifyUrl || null,
          spotifyArtistId: incoming.spotifyArtistId || null,
          image: incoming.image || null,
        })
        .returning({ id: artists.id });
      if (created) artistIds.add(created.id);
    }
    const mirror = createImageMirror(env);
    let image = coverImageUrl,
      content = contentHtml;
    if (image) image = await mirror.mirrorImageUrl(image, "cover").catch(() => image);
    content = (await mirror.mirrorInlineImagesInHtml(content, sourceUrl)).html;
    const contentJson = JSON.stringify(generateJSON(content, [StarterKit, Image, Link]));
    const imports = await db
      .select({
        postId: postImportSources.postId,
        sourceUrl: postImportSources.sourceUrl,
        title: posts.title,
      })
      .from(postImportSources)
      .leftJoin(posts, eq(postImportSources.postId, posts.id));
    const previous = findMatchingImportSource(imports, sourceUrl, title);
    const [existingPost] = previous
      ? await db
          .select({ slug: posts.slug })
          .from(posts)
          .where(eq(posts.id, previous.postId))
          .limit(1)
      : await db
          .select({ slug: posts.slug })
          .from(posts)
          .where(
            sql`lower(${posts.title}) = ${title.toLowerCase()} OR ${posts.slug} = ${slugify(title)}`,
          )
          .limit(1);
    const slug = existingPost?.slug || (await resolveUniquePostSlug(title));
    const postId = sql<number>`(SELECT id FROM ${posts} WHERE ${posts.slug} = ${slug})`;
    const values = {
      title,
      category,
      excerpt: sanitizeAndTruncateExcerpt(excerpt, 500),
      content: contentJson,
      coverImage: image,
      authorId: resolvedAuthorId,
      status,
      isCoverStory,
      tags,
      updatedAt: modifiedDate,
    };
    const source = {
      sourceAuthorSlug,
      sourceCategoriesJson: JSON.stringify(rawCategories),
      sourceModifiedAt: sourceModifiedAt ? modifiedDate : null,
      sourcePublishedAt: publishedDate,
      sourceUrl,
      updatedAt: new Date(),
    };
    await db.batch([
      db
        .update(posts)
        .set({ isCoverStory: false })
        .where(sql`${isCoverStory} = 1 AND ${posts.isCoverStory} = 1`),
      db
        .insert(posts)
        .values({
          ...values,
          slug,
          vertical: "music",
          publishedAt: publishedDate,
          createdAt: publishedDate,
        })
        .onConflictDoUpdate({ target: posts.slug, set: values }),
      db.delete(postArtists).where(eq(postArtists.postId, postId)),
      db
        .insert(postImportSources)
        .values({ postId, ...source })
        .onConflictDoUpdate({ target: postImportSources.postId, set: source }),
      ...(artistIds.size
        ? [db.insert(postArtists).values([...artistIds].map((artistId) => ({ artistId, postId })))]
        : []),
    ]);
    const [saved] = await db
      .select({ id: posts.id })
      .from(posts)
      .where(eq(posts.slug, slug))
      .limit(1);
    if (!saved) throw new Error("Imported post was not saved");
    return { success: true as const, postId: saved.id };
  }

  return { analyzePostInternal, importPostInternal };
}
