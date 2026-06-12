"use server";

import { db } from "@/lib/db";
import { posts, postArtists, artists, postImportSources } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { checkRole } from "@/lib/auth/roles";
import { revalidatePath, revalidateTag } from "next/cache";
import { generateJSON } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import { createImageMirror } from "../../../../../scripts/lib/image-mirror";
import { selectPrimarySubjectArtists } from "@/lib/admin/article-subject-artists";
import { normalizeImportSourceUrl, normalizeImportTitle } from "@/lib/admin/wordpress-backfill";
import { decodeHtmlEntities } from "@/lib/utils/html";

const backfillAnalysisSchema = z.object({
  category: z.enum(["COUNTRY", "EDM", "HARDCORE & ROCK", "HIP-HOP & R&B", "OTHER"]),
  excerpt: z.string(),
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
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
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
    const tokenData = await tokenResponse.json();
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
    const searchData = await searchResponse.json();
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

export type BackfillAnalysis = z.infer<typeof backfillAnalysisSchema> & {
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

export async function analyzePostInternal(
  title: string,
  contentHtml: string,
): Promise<BackfillAnalysis> {
  const apiKey =
    process.env.AI_GATEWAY_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Missing API key: Please configure GOOGLE_GENERATIVE_AI_API_KEY, GEMINI_API_KEY, or AI_GATEWAY_API_KEY in the environment.",
    );
  }

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
2. Generate a concise, engaging summary/excerpt of the post in 2-3 sentences.
3. Identify only the primary subject artist(s), band(s), or DJ(s) the article is about. Prefer artists named in the title, opening paragraph, and final call-to-action. Exclude artists mentioned only as inspirations, comparisons, influences, playlist references, or one-off examples.
4. For each primary subject artist, extract their default music genre matching our categories, their location/hometown if mentioned, and write a brief professionally-written biography (2-4 sentences) that highlights their background.`;

  const { object } = await generateObject({
    model: google("gemini-3.5-flash"),
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
    artistsMapping,
  };
}

export async function analyzeWordPressPostAction(
  title: string,
  contentHtml: string,
): Promise<BackfillAnalysis> {
  if (!(await checkRole("super_admin"))) {
    throw new Error("Unauthorized: Only super admins can run AI analysis");
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

export async function importPostInternal(payload: ImportWordPressPostPayload) {
  const {
    title,
    excerpt,
    category,
    contentHtml,
    coverImageUrl,
    authorId,
    isCoverStory,
    sourceUrl,
    sourceAuthorSlug,
    sourcePublishedAt,
    sourceModifiedAt,
    rawCategories,
    selectedArtistIds,
    newArtistsToCreate,
    status = "published",
    tags = [],
  } = payload;

  return await db.transaction(async (tx) => {
    // 1. Create missing artists
    const artistIds = [...selectedArtistIds];

    for (const newArtist of newArtistsToCreate) {
      const slug = await resolveUniqueArtistSlug(newArtist.name);
      const [insertedArtist] = await tx
        .insert(artists)
        .values({
          name: newArtist.name,
          slug,
          genre: newArtist.genre,
          location: newArtist.location || "Arkansas",
          bio: newArtist.bio,
          claimed: false,
          spotifyUrl: newArtist.spotifyUrl || null,
          spotifyArtistId: newArtist.spotifyArtistId || null,
          image: newArtist.image || null,
        })
        .returning({ id: artists.id });

      if (insertedArtist) {
        artistIds.push(insertedArtist.id);
      }
    }

    // 2. Mirror cover and content images
    const imageMirror = createImageMirror();
    let mirroredCoverImageUrl = coverImageUrl;

    if (coverImageUrl) {
      try {
        mirroredCoverImageUrl = await imageMirror.mirrorImageUrl(coverImageUrl, "cover");
      } catch (error) {
        console.error("Failed to mirror cover image during import:", error);
      }
    }

    let mirroredContentHtml = contentHtml;
    try {
      const inlineResult = await imageMirror.mirrorInlineImagesInHtml(contentHtml, sourceUrl);
      mirroredContentHtml = inlineResult.html;
    } catch (error) {
      console.error("Failed to mirror inline images during import:", error);
    }

    // Convert HTML to Tiptap JSON
    const contentTiptapJson = JSON.stringify(
      generateJSON(mirroredContentHtml, [StarterKit, Image, Link]),
    );

    // 3. Enforce single Cover Story constraint if checked
    if (isCoverStory) {
      await tx.update(posts).set({ isCoverStory: false }).where(eq(posts.isCoverStory, true));
    }

    const publishedDate = new Date(sourcePublishedAt);
    const modifiedDate = sourceModifiedAt ? new Date(sourceModifiedAt) : publishedDate;

    // Check if the post was already imported
    const [existingImport] = await tx
      .select({ postId: postImportSources.postId })
      .from(postImportSources)
      .where(eq(postImportSources.sourceUrl, sourceUrl))
      .limit(1);

    let postId = existingImport?.postId ?? null;
    let postSlug = "";

    if (!postId) {
      const baseSlug = slugify(title);
      const [existingPost] = await tx
        .select({ id: posts.id, slug: posts.slug })
        .from(posts)
        .where(sql`lower(${posts.title}) = ${title.toLowerCase()} OR ${posts.slug} = ${baseSlug}`)
        .limit(1);

      if (existingPost) {
        postId = existingPost.id;
        postSlug = existingPost.slug;

        // Insert a postImportSources record so we track it going forward
        await tx.insert(postImportSources).values({
          postId,
          sourceAuthorSlug,
          sourceCategoriesJson: JSON.stringify(rawCategories),
          sourcePublishedAt: publishedDate,
          sourceModifiedAt: sourceModifiedAt ? new Date(sourceModifiedAt) : null,
          sourceUrl,
        });
      }
    }

    if (postId) {
      // 4a. Update existing post
      const [existingPost] = await tx
        .select({ slug: posts.slug })
        .from(posts)
        .where(eq(posts.id, postId))
        .limit(1);

      postSlug = existingPost?.slug || (await resolveUniquePostSlug(title));

      await tx
        .update(posts)
        .set({
          title,
          category,
          excerpt,
          content: contentTiptapJson,
          coverImage: mirroredCoverImageUrl,
          authorId,
          status,
          isCoverStory,
          tags,
          updatedAt: modifiedDate,
        })
        .where(eq(posts.id, postId));

      // Clear old Post-Artist relations
      await tx.delete(postArtists).where(eq(postArtists.postId, postId));
    } else {
      // 4b. Generate post slug and insert post
      postSlug = await resolveUniquePostSlug(title);
      const [insertedPost] = await tx
        .insert(posts)
        .values({
          title,
          slug: postSlug,
          category,
          excerpt,
          content: contentTiptapJson,
          coverImage: mirroredCoverImageUrl,
          authorId,
          status,
          isCoverStory,
          tags,
          publishedAt: publishedDate,
          createdAt: publishedDate,
          updatedAt: modifiedDate,
        })
        .returning({ id: posts.id });

      if (!insertedPost) {
        throw new Error("Failed to insert backfilled post");
      }
      postId = insertedPost.id;

      // Save Import Source record
      await tx.insert(postImportSources).values({
        postId,
        sourceAuthorSlug,
        sourceCategoriesJson: JSON.stringify(rawCategories),
        sourcePublishedAt: publishedDate,
        sourceModifiedAt: sourceModifiedAt ? new Date(sourceModifiedAt) : null,
        sourceUrl,
      });
    }

    // 5. Link Post-Artist relations
    if (artistIds.length > 0) {
      const relationValues = artistIds.map((artistId) => ({
        artistId,
        postId,
      }));
      await tx.insert(postArtists).values(relationValues);
    }

    // 6. Revalidate
    if (status === "published") {
      revalidateTag("posts", "max");
      revalidateTag("stats-monthly", "max");
      if (artistIds.length > 0) {
        revalidateTag("artists", "max");
      }
    }

    revalidatePath("/admin/posts");
    revalidatePath("/admin/posts/wordpress");
    revalidatePath("/");
    revalidatePath(`/posts/${postSlug}`);

    return { success: true, postId };
  });
}

export async function importWordPressPostAction(payload: ImportWordPressPostPayload) {
  if (!(await checkRole("super_admin"))) {
    throw new Error("Unauthorized: Only super admins can import posts");
  }
  return importPostInternal(payload);
}

export async function syncExistingArtistsSpotifyAction() {
  if (!(await checkRole("super_admin"))) {
    throw new Error("Unauthorized: Only super admins can sync Spotify");
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

  revalidatePath("/admin/artists");
  revalidatePath("/artists");

  return {
    success: true,
    total: artistsToSync.length,
    updatedCount,
    skippedCount,
  };
}

export async function syncPublishedWordPressTagsAction() {
  if (!(await checkRole("super_admin"))) {
    throw new Error("Unauthorized: Only super admins can sync WordPress tags");
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
  const touchedSlugs = new Set<string>();

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
    touchedSlugs.add(importedPost.slug);
  }

  revalidateTag("posts", "max");
  revalidatePath("/");
  revalidatePath("/music");
  revalidatePath("/admin/posts");
  revalidatePath("/admin/posts/wordpress");
  for (const slug of touchedSlugs) {
    revalidatePath(`/article/${slug}`);
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

    const data = await response.json();
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
