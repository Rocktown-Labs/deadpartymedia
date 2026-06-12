import { analyzePostInternal, importPostInternal } from "../admin/posts/wordpress/actions";
import { db } from "@/lib/db";
import { postImportSources, postArtists, artists, backfillRuns, posts } from "@/lib/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { generateHTML } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import {
  normalizeImportSourceUrl,
  normalizeImportTitle,
  shouldReprocessImportedPost,
} from "@/lib/admin/wordpress-backfill";
import { decodeHtmlEntities } from "@/lib/utils/html";
import { normalizeStoredPostContent } from "@/lib/content/post-content";

interface BackfillInput {
  limit: number;
  offset: number;
  authorId: string;
  status: "draft" | "published";
  runId: string;
  source?: "wordpress" | "local_drafts";
}

export async function wordpressBackfillWorkflow(input: BackfillInput) {
  "use workflow";

  try {
    // 1. Fetch posts from the requested source (step)
    const wpPosts =
      input.source === "local_drafts"
        ? await fetchImportedDraftPostsStep(input.limit, input.offset)
        : await fetchWordPressPostsStep(input.limit, input.offset);

    // Update total posts in DB
    await updateRunTotalPostsStep(input.runId, wpPosts.length);

    // 2. Loop through posts and process them
    const results = [];
    let processedCount = 0;

    for (const post of wpPosts) {
      const res = await processPostStep(post, input.authorId, input.status);
      results.push(res);
      processedCount++;
      // Update processed count and results in DB
      await updateRunProgressStep(input.runId, processedCount, results);
    }

    // Update final status to completed
    await completeRunStep(input.runId, results);

    return {
      processed: results.length,
      results,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`WordPress backfill workflow failed for run ${input.runId}:`, errorMsg);
    await failRunStep(input.runId, errorMsg);
    throw error;
  }
}

async function updateRunTotalPostsStep(runId: string, totalPosts: number) {
  "use step";
  await db
    .update(backfillRuns)
    .set({
      totalPosts,
      updatedAt: new Date(),
    })
    .where(eq(backfillRuns.runId, runId));
}

async function updateRunProgressStep(runId: string, processedPosts: number, results: any[]) {
  "use step";
  await db
    .update(backfillRuns)
    .set({
      processedPosts,
      results,
      updatedAt: new Date(),
    })
    .where(eq(backfillRuns.runId, runId));
}

async function completeRunStep(runId: string, results: any[]) {
  "use step";
  await db
    .update(backfillRuns)
    .set({
      status: "completed",
      results,
      updatedAt: new Date(),
    })
    .where(eq(backfillRuns.runId, runId));
}

async function failRunStep(runId: string, errorMsg: string) {
  "use step";
  const [run] = await db
    .select({ results: backfillRuns.results })
    .from(backfillRuns)
    .where(eq(backfillRuns.runId, runId))
    .limit(1);

  const currentResults = Array.isArray(run?.results) ? (run.results as any[]) : [];
  const updatedResults = [
    ...currentResults,
    { status: "error", error: `Workflow failed: ${errorMsg}` },
  ];

  await db
    .update(backfillRuns)
    .set({
      status: "failed",
      results: updatedResults,
      updatedAt: new Date(),
    })
    .where(eq(backfillRuns.runId, runId));
}

async function fetchWordPressPostsStep(limit: number, offset: number) {
  "use step";

  const response = await fetch(
    `https://public-api.wordpress.com/rest/v1.1/sites/deadpartymedia.wordpress.com/posts?number=${limit}&offset=${offset}`,
    { cache: "no-store" },
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch WordPress posts: ${response.statusText}`);
  }

  const data = await response.json();
  if (!data || !Array.isArray(data.posts)) {
    return [];
  }

  return data.posts.map((post: any) => ({
    id: post.ID,
    title: decodeHtmlEntities(post.title),
    url: post.URL,
    excerpt: post.excerpt,
    content: post.content,
    date: post.date,
    modified: post.modified,
    authorName: post.author?.name || "Petty Vandalism",
    authorSlug: post.author?.nice_name || "pettyvandalism",
    coverImage: post.featured_image || null,
    rawCategories: Object.keys(post.categories || {}),
    rawTags: Object.keys(post.tags || {}),
  }));
}

async function fetchImportedDraftPostsStep(limit: number, offset: number) {
  "use step";

  const rows = await db
    .select({
      content: posts.content,
      coverImage: posts.coverImage,
      excerpt: posts.excerpt,
      modifiedAt: posts.updatedAt,
      postId: posts.id,
      rawTags: posts.tags,
      sourceAuthorSlug: postImportSources.sourceAuthorSlug,
      sourceCategoriesJson: postImportSources.sourceCategoriesJson,
      sourceModifiedAt: postImportSources.sourceModifiedAt,
      sourcePublishedAt: postImportSources.sourcePublishedAt,
      sourceUrl: postImportSources.sourceUrl,
      title: posts.title,
    })
    .from(postImportSources)
    .innerJoin(posts, eq(postImportSources.postId, posts.id))
    .where(and(eq(posts.status, "draft")))
    .orderBy(desc(posts.createdAt))
    .limit(limit)
    .offset(offset);

  return rows.map((row) => ({
    id: row.postId,
    title: decodeHtmlEntities(row.title),
    url: row.sourceUrl,
    excerpt: row.excerpt,
    content: storedContentToHtml(row.content),
    date: row.sourcePublishedAt.toISOString(),
    modified: (row.sourceModifiedAt ?? row.modifiedAt).toISOString(),
    authorName: "Petty Vandalism",
    authorSlug: row.sourceAuthorSlug || "pettyvandalism",
    coverImage: row.coverImage || null,
    rawCategories: parseSourceCategories(row.sourceCategoriesJson),
    rawTags: row.rawTags || [],
  }));
}

function storedContentToHtml(content: string) {
  const normalizedContent = normalizeStoredPostContent(content);
  if (!normalizedContent.tiptapDoc) {
    return content;
  }

  return generateHTML(normalizedContent.tiptapDoc, [StarterKit, Image, Link]);
}

function parseSourceCategories(sourceCategoriesJson: string) {
  try {
    const parsed = JSON.parse(sourceCategoriesJson);
    return Array.isArray(parsed) ? parsed.filter((category) => typeof category === "string") : [];
  } catch {
    return [];
  }
}

async function processPostStep(post: any, authorId: string, status: "draft" | "published") {
  "use step";

  try {
    // Check if the post is already imported
    const existingImport = await findExistingImportForPost(post.url, post.title);

    if (existingImport) {
      // Fetch the existing post status. Draft/archived imports still need the
      // full AI enrichment path so bulk runs can clean them up and publish them.
      const [existingPost] = await db
        .select({
          id: posts.id,
          status: posts.status,
          title: posts.title,
        })
        .from(posts)
        .where(eq(posts.id, existingImport.postId))
        .limit(1);

      if (!existingPost) {
        throw new Error(`Imported source points to missing local post ${existingImport.postId}`);
      }

      if (shouldReprocessImportedPost(existingPost.status)) {
        const importResult = await analyzeAndImportPost(post, authorId, status);

        return {
          url: post.url,
          title: post.title,
          status:
            existingPost?.status === "draft"
              ? `reprocessed_draft_to_${status}`
              : `reprocessed_import_to_${status}`,
          postId: importResult.postId,
        };
      }

      if (existingPost) {
        // Already-published imports should not be rewritten during bulk runs.
        // Keep the live status intact and only sync lightweight source metadata.
        await db
          .update(posts)
          .set({
            tags: post.rawTags || null,
            updatedAt: new Date(),
          })
          .where(eq(posts.id, existingPost.id));
      }

      // It's already imported. Let's find associated artists and update their Spotify info if null
      const associatedArtists = await db
        .select({
          id: artists.id,
          name: artists.name,
          spotifyArtistId: artists.spotifyArtistId,
          image: artists.image,
        })
        .from(postArtists)
        .innerJoin(artists, eq(postArtists.artistId, artists.id))
        .where(eq(postArtists.postId, existingImport.postId));

      let updatedCount = 0;
      const spotifyWarnings = [];

      for (const artist of associatedArtists) {
        if (!artist.spotifyArtistId) {
          // Attempt Spotify search
          try {
            const spotifyMatch = await searchSpotifyArtistHelper(artist.name);
            if (spotifyMatch) {
              await db
                .update(artists)
                .set({
                  spotifyArtistId: spotifyMatch.spotifyArtistId,
                  spotifyUrl: spotifyMatch.spotifyUrl,
                  image: artist.image || spotifyMatch.imageUrl || null,
                  updatedAt: new Date(),
                })
                .where(eq(artists.id, artist.id));
              updatedCount++;
            }
          } catch (error: any) {
            spotifyWarnings.push(error.message || String(error));
          }
        }
      }

      return {
        url: post.url,
        title: post.title,
        status: "already_published",
        updatedArtistsCount: updatedCount,
        postId: existingImport.postId,
        warnings: spotifyWarnings.length > 0 ? spotifyWarnings : undefined,
      };
    }

    const importRes = await analyzeAndImportPost(post, authorId, status);

    return {
      url: post.url,
      title: post.title,
      status: "imported",
      postId: importRes.postId,
    };
  } catch (error) {
    console.error(`Error processing post ${post.title}:`, error);
    if (isApiAccessError(error)) {
      throw error;
    }
    return {
      url: post.url,
      title: post.title,
      status: "error",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function findExistingImportForPost(sourceUrl: string, title: string) {
  const exactMatches = await db
    .select({
      postId: postImportSources.postId,
      sourceUrl: postImportSources.sourceUrl,
      title: posts.title,
    })
    .from(postImportSources)
    .leftJoin(posts, eq(postImportSources.postId, posts.id))
    .where(eq(postImportSources.sourceUrl, sourceUrl))
    .limit(1);

  if (exactMatches[0]) {
    return exactMatches[0];
  }

  const importRows = await db
    .select({
      postId: postImportSources.postId,
      sourceUrl: postImportSources.sourceUrl,
      title: posts.title,
    })
    .from(postImportSources)
    .leftJoin(posts, eq(postImportSources.postId, posts.id));

  const normalizedUrl = normalizeImportSourceUrl(sourceUrl);
  const normalizedTitle = normalizeImportTitle(title);

  return importRows.find(
    (row) =>
      normalizeImportSourceUrl(row.sourceUrl) === normalizedUrl ||
      normalizeImportTitle(row.title) === normalizedTitle,
  );
}

async function analyzeAndImportPost(post: any, authorId: string, status: "draft" | "published") {
  const analysis = await analyzePostInternal(post.title, post.content);

  const selectedArtistIds = analysis.artistsMapping
    .filter((artist) => artist.existingId !== null)
    .map((artist) => artist.existingId as number);

  const newArtistsToCreate = analysis.artistsMapping
    .filter((artist) => artist.existingId === null)
    .map((artist) => ({
      name: artist.name,
      genre: artist.genre || "OTHER",
      location: artist.location || "Arkansas",
      bio: artist.bio || "",
      spotifyUrl: artist.spotifyUrl || null,
      spotifyArtistId: artist.spotifyArtistId || null,
      image: artist.spotifyImageUrl || null,
    }));

  return importPostInternal({
    authorId,
    category: analysis.category,
    contentHtml: post.content,
    coverImageUrl: post.coverImage,
    excerpt: analysis.excerpt || post.excerpt,
    isCoverStory: false,
    newArtistsToCreate,
    rawCategories: post.rawCategories,
    selectedArtistIds,
    sourceAuthorSlug: post.authorSlug,
    sourceModifiedAt: post.modified,
    sourcePublishedAt: post.date,
    sourceUrl: post.url,
    status,
    tags: post.rawTags,
    title: post.title,
  });
}

// Helper Spotify search
async function searchSpotifyArtistHelper(
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
      throw new Error(`Failed to fetch Spotify auth token: status ${tokenResponse.status}`);
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
      if (searchResponse.status === 403) {
        console.warn(
          "Spotify API returned 403 Forbidden. Check settings (Web API enabled) in Spotify Developer Dashboard.",
        );
        throw new Error(
          "Spotify API returned 403 Forbidden. Please verify your Spotify configuration.",
        );
      }
      throw new Error(`Spotify search failed: status ${searchResponse.status}`);
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
    console.error("Error searching Spotify in backfill workflow helper:", error);
    throw error;
  }
}

function isApiAccessError(error: any): boolean {
  if (!error) {
    return false;
  }
  const message = error instanceof Error ? error.message : String(error);
  const name = error instanceof Error && error.name ? error.name : "";
  const lowerMsg = message.toLowerCase();

  return (
    name.includes("AI_APICallError") ||
    lowerMsg.includes("api key") ||
    lowerMsg.includes("api_key") ||
    lowerMsg.includes("rate limit") ||
    lowerMsg.includes("rate-limit") ||
    lowerMsg.includes("free tier") ||
    lowerMsg.includes("quota") ||
    lowerMsg.includes("billing") ||
    lowerMsg.includes("credits") ||
    lowerMsg.includes("unauthorized")
  );
}
