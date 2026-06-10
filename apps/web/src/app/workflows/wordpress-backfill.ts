import { analyzePostInternal, importPostInternal } from "../admin/posts/wordpress/actions";
import { db } from "@/lib/db";
import { postImportSources, postArtists, artists } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

interface BackfillInput {
  limit: number;
  offset: number;
  authorId: string;
  status: "draft" | "published";
}

export async function wordpressBackfillWorkflow(input: BackfillInput) {
  "use workflow";

  // 1. Fetch posts from WordPress REST API (step)
  const wpPosts = await fetchWordPressPostsStep(input.limit, input.offset);

  // 2. Loop through posts and process them
  const results = [];
  for (const post of wpPosts) {
    const res = await processPostStep(post, input.authorId, input.status);
    results.push(res);
  }

  return {
    processed: results.length,
    results,
  };
}

async function fetchWordPressPostsStep(limit: number, offset: number) {
  "use step";

  const response = await fetch(
    `https://public-api.wordpress.com/rest/v1.1/sites/deadpartymedia.wordpress.com/posts?number=${limit}&offset=${offset}`,
    { cache: "no-store" }
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
    title: post.title,
    url: post.URL,
    excerpt: post.excerpt,
    content: post.content,
    date: post.date,
    modified: post.modified,
    authorName: post.author?.name || "Petty Vandalism",
    authorSlug: post.author?.nice_name || "pettyvandalism",
    coverImage: post.featured_image || null,
    rawCategories: Object.keys(post.categories || {}),
  }));
}

async function processPostStep(post: any, authorId: string, status: "draft" | "published") {
  "use step";

  try {
    // Check if the post is already imported
    const [existingImport] = await db
      .select({ postId: postImportSources.postId })
      .from(postImportSources)
      .where(eq(postImportSources.sourceUrl, post.url))
      .limit(1);

    if (existingImport) {
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
      for (const artist of associatedArtists) {
        if (!artist.spotifyArtistId) {
          // Attempt Spotify search
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
        }
      }

      return {
        url: post.url,
        title: post.title,
        status: "already_imported",
        updatedArtistsCount: updatedCount,
      };
    }

    // Run AI analysis
    const analysis = await analyzePostInternal(post.title, post.content);

    // Prepare payload
    const selectedArtistIds = analysis.artistsMapping
      .filter((a) => a.existingId !== null)
      .map((a) => a.existingId as number);

    const newArtistsToCreate = analysis.artistsMapping
      .filter((a) => a.existingId === null)
      .map((a) => ({
        name: a.name,
        genre: a.genre || "OTHER",
        location: a.location || "Arkansas",
        bio: a.bio || "",
        spotifyUrl: a.spotifyUrl || null,
        spotifyArtistId: a.spotifyArtistId || null,
        image: a.spotifyImageUrl || null,
      }));

    const payload = {
      authorId,
      category: analysis.category,
      contentHtml: post.content,
      coverImageUrl: post.coverImage,
      excerpt: analysis.excerpt || post.excerpt,
      isCoverStory: false,
      newArtistsToCreate,
      rawCategories: post.rawCategories,
      selectedArtistIds,
      slug: post.authorSlug,
      sourceAuthorSlug: post.authorSlug,
      sourceModifiedAt: post.modified,
      sourcePublishedAt: post.date,
      sourceUrl: post.url,
      title: post.title,
      status,
    };

    const importRes = await importPostInternal(payload);

    return {
      url: post.url,
      title: post.title,
      status: "imported",
      postId: importRes.postId,
    };
  } catch (error) {
    console.error(`Error processing post ${post.title}:`, error);
    return {
      url: post.url,
      title: post.title,
      status: "error",
      error: error instanceof Error ? error.message : String(error),
    };
  }
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
    console.error("Error searching Spotify in backfill workflow helper:", error);
    return null;
  }
}
