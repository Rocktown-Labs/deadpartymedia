import { zValidator } from "@hono/zod-validator";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { Hono } from "hono";

import { artistUpdateSchema } from "@dpmedia/contracts";

import { artists, eventArtists, events, postArtists, posts, users } from "@dpmedia/db/schema";

import { requireAuth } from "../../auth";

import { getMusicDb as getDb } from "../../db";

import { r2Configured, r2Put } from "../../lib/r2";

import { generateImagePathname, validateImageFile } from "../../lib/upload";

import type { AppEnv } from "../../bindings";

const ARTIST_GENRES = ["COUNTRY", "EDM", "HARDCORE & ROCK", "HIP-HOP & R&B", "OTHER"] as const;

type ArtistGenre = (typeof ARTIST_GENRES)[number];

function isArtistGenre(value: string): value is ArtistGenre {
  return ARTIST_GENRES.includes(value as ArtistGenre);
}

function resolveAuthorName(
  firstName: string | null,
  lastName: string | null,
  email: string | null,
) {
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
  if (fullName.length > 0) {
    return fullName;
  }
  if (typeof email === "string" && email.trim().length > 0) {
    return email;
  }
  return "Unknown";
}

export const musicArtistsRoutes = new Hono<AppEnv>()
  .get("/", zValidator("query", z.record(z.string(), z.string())), async (c) => {
    try {
      const genre = c.req.query("genre");
      const paginated = c.req.query("paginated") === "true";
      const limit = Math.max(1, Math.min(Number.parseInt(c.req.query("limit") || "24", 10), 48));
      const offset = Math.max(0, Number.parseInt(c.req.query("offset") || "0", 10));
      const sort = c.req.query("sort") === "name" ? "name" : "created_at";
      const order = c.req.query("order") === "asc" ? "asc" : "desc";
      const claimedParam = c.req.query("claimed");

      const db = getDb(c.env);

      // Build where conditions
      const conditions = [eq(artists.hidden, false)];
      if (claimedParam === "true") {
        conditions.push(eq(artists.claimed, true));
      }
      if (genre && isArtistGenre(genre)) {
        conditions.push(eq(artists.genre, genre));
      }

      // Query artists with counts
      const results = await db
        .select({
          article_count: sql<number>`(
          SELECT COUNT(*)
          FROM post_artists
          INNER JOIN posts ON post_artists.post_id = posts.id
          WHERE post_artists.artist_id = artists.id
          AND posts.status = 'published'
        )`.as("article_count"),
          bio: artists.bio,
          claimed: artists.claimed,
          created_at: artists.createdAt,
          event_count: sql<number>`(
          SELECT COUNT(*)
          FROM event_artists
          INNER JOIN events ON event_artists.event_id = events.id
          WHERE event_artists.artist_id = artists.id
          AND events.status = 'published'
        )`.as("event_count"),
          genre: artists.genre,
          hidden: artists.hidden,
          id: artists.id,
          image: artists.image,
          instagram: artists.instagram,
          location: artists.location,
          name: artists.name,
          profile_views: artists.profileViews,
          slug: artists.slug,
          spotify_artist_id: artists.spotifyArtistId,
          spotify_url: artists.spotifyUrl,
          tiktok: artists.tiktok,
          twitter: artists.twitter,
          website: artists.website,
        })
        .from(artists)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      // Deduplicate artists by name (case-insensitive)
      const uniqueArtists = new Map<string, (typeof results)[0]>();

      for (const artist of results) {
        const normalizedName = artist.name.trim().toLowerCase();
        const existing = uniqueArtists.get(normalizedName);

        if (!existing) {
          uniqueArtists.set(normalizedName, artist);
          continue;
        }

        // Conflict Resolution Logic:
        // 1. Prefer claimed profiles
        // 2. Prefer profiles with images
        // 3. Prefer profiles with more engagement (articles + events)
        // 4. Prefer profiles with more views
        let shouldReplace = false;

        if (artist.claimed && !existing.claimed) {
          shouldReplace = true;
        } else if (artist.claimed === existing.claimed) {
          if (artist.image && !existing.image) {
            shouldReplace = true;
          } else if (!!artist.image === !!existing.image) {
            const artistTotal = (artist.article_count || 0) + (artist.event_count || 0);
            const existingTotal = (existing.article_count || 0) + (existing.event_count || 0);

            if (artistTotal > existingTotal) {
              shouldReplace = true;
            } else if (artistTotal === existingTotal) {
              if ((artist.profile_views || 0) > (existing.profile_views || 0)) {
                shouldReplace = true;
              }
            }
          }
        }

        if (shouldReplace) {
          uniqueArtists.set(normalizedName, artist);
        }
      }

      // Transform to match existing Artist interface
      const artistList = [...uniqueArtists.values()]
        .map((artist) => ({
          article_count: artist.article_count || 0,
          bio: artist.bio,
          claimed: artist.claimed,
          created_at: artist.created_at.toISOString(),
          event_count: artist.event_count || 0,
          genre: artist.genre,
          hidden: artist.hidden,
          id: artist.id,
          image: artist.image,
          instagram: artist.instagram,
          location: artist.location,
          name: artist.name,
          profile_views: artist.profile_views,
          slug: artist.slug,
          spotify_artist_id: artist.spotify_artist_id,
          spotify_url: artist.spotify_url,
          tiktok: artist.tiktok,
          twitter: artist.twitter,
          website: artist.website,
        }))
        .toSorted((a, b) => {
          const direction = order === "asc" ? 1 : -1;
          if (sort === "name") {
            return a.name.localeCompare(b.name) * direction;
          }
          return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * direction;
        });

      if (paginated) {
        const pageResults = artistList.slice(offset, offset + limit);
        return c.json(
          {
            count: artistList.length,
            hasMore: offset + limit < artistList.length,
            results: pageResults,
          },
          200,
          {
            "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=300",
          },
        );
      }

      return c.json(artistList, 200, {
        "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=300",
      });
    } catch (error) {
      console.error("[api] fetch_artists:", error);
      return c.json({ error: "Failed to fetch artists" }, 500);
    }
  })
  .get("/me", zValidator("query", z.record(z.string(), z.string())), async (c) => {
    const auth = requireAuth(c);
    const userId = auth.userId;
    try {
      const db = getDb(c.env);

      // Query artist where claimedById matches user's Clerk ID
      const [artist] = await db
        .select({
          article_count: sql<number>`(
          SELECT COUNT(*)
          FROM post_artists
          INNER JOIN posts ON post_artists.post_id = posts.id
          WHERE post_artists.artist_id = artists.id
          AND posts.status = 'published'
        )`.as("article_count"),
          bio: artists.bio,
          claimed: artists.claimed,
          created_at: artists.createdAt,
          event_count: sql<number>`(
          SELECT COUNT(*)
          FROM event_artists
          INNER JOIN events ON event_artists.event_id = events.id
          WHERE event_artists.artist_id = artists.id
          AND events.status = 'published'
        )`.as("event_count"),
          genre: artists.genre,
          id: artists.id,
          image: artists.image,
          instagram: artists.instagram,
          location: artists.location,
          name: artists.name,
          phone_number: artists.phoneNumber,
          profile_views: artists.profileViews,
          slug: artists.slug,
          spotify_artist_id: artists.spotifyArtistId,
          spotify_url: artists.spotifyUrl,
          tiktok: artists.tiktok,
          twitter: artists.twitter,
          website: artists.website,
        })
        .from(artists)
        .where(eq(artists.claimedById, userId))
        .limit(1);

      if (!artist) {
        return c.json({ error: "Artist not found" }, 404);
      }

      // Transform to match existing Artist interface
      const artistData = {
        article_count: artist.article_count || 0,
        bio: artist.bio,
        claimed: artist.claimed,
        created_at: artist.created_at.toISOString(),
        event_count: artist.event_count || 0,
        genre: artist.genre,
        id: artist.id,
        image: artist.image,
        instagram: artist.instagram,
        location: artist.location,
        name: artist.name,
        phone_number: artist.phone_number,
        profile_views: artist.profile_views,
        slug: artist.slug,
        spotify_artist_id: artist.spotify_artist_id,
        spotify_url: artist.spotify_url,
        tiktok: artist.tiktok,
        twitter: artist.twitter,
        website: artist.website,
      };

      return c.json(artistData);
    } catch (error) {
      console.error("[api] fetch_current_user_artist:", error);
      return c.json({ error: "Failed to fetch artist" }, 500);
    }
  })
  .patch("/me", async (c) => {
    const auth = requireAuth(c);
    const userId = auth.userId;
    try {
      const db = getDb(c.env);
      const formData = await c.req.formData();

      const name = String(formData.get("name") ?? "");
      const bio = String(formData.get("bio") ?? "");
      const location = String(formData.get("location") ?? "");
      const genre = String(formData.get("genre") ?? "");

      const spotifyUrl = String(formData.get("spotifyUrl") ?? formData.get("spotify_url") ?? "");
      const instagram = String(formData.get("instagram") ?? "");
      const twitter = String(formData.get("twitter") ?? "");
      const tiktok = String(formData.get("tiktok") ?? "");
      const website = String(formData.get("website") ?? "");
      const phoneNumber = String(formData.get("phoneNumber") ?? formData.get("phone_number") ?? "");

      // Image can be either a File or a URL string (or empty to clear)
      const imageField = formData.get("image");
      let imageUrl: string | undefined;

      if (imageField instanceof File) {
        const validation = validateImageFile(imageField);
        if (!validation.valid) {
          return c.json({ error: validation.error }, 400);
        }

        // Vercel Blob put() → R2 (r2Put); same failure shape when storage
        // is unavailable.
        if (!r2Configured(c.env)) {
          return c.json({ error: "Image storage is not configured" }, 500);
        }

        const pathname = generateImagePathname("profile", imageField.name, true);
        imageUrl = await r2Put(c.env, pathname, await imageField.arrayBuffer(), imageField.type);
      } else if (typeof imageField === "string") {
        // Allow clearing with empty string
        imageUrl = imageField;
      }

      const validationResult = artistUpdateSchema.safeParse({
        bio,
        genre,
        image: imageUrl ?? "",
        instagram,
        location,
        name,
        phoneNumber,
        spotifyUrl,
        tiktok,
        twitter,
        website,
      });

      if (!validationResult.success) {
        return c.json({ error: "Validation failed", issues: validationResult.error.issues }, 400);
      }

      const validated = validationResult.data;

      const [updated] = await db
        .update(artists)
        .set({
          bio: validated.bio,
          genre: validated.genre,
          image: validated.image ?? null,
          instagram: validated.instagram ?? null,
          location: validated.location,
          name: validated.name,
          phoneNumber: validated.phoneNumber ?? null,
          spotifyUrl: validated.spotifyUrl ?? null,
          tiktok: validated.tiktok ?? null,
          twitter: validated.twitter ?? null,
          updatedAt: new Date(),
          website: validated.website ?? null,
        })
        .where(eq(artists.claimedById, userId))
        .returning();

      if (!updated) {
        return c.json({ error: "Artist not found" }, 404);
      }

      // Re-fetch with computed counts to keep PATCH response consistent with GET
      const [artistWithCounts] = await db
        .select({
          article_count: sql<number>`(
          SELECT COUNT(*)
          FROM post_artists
          INNER JOIN posts ON post_artists.post_id = posts.id
          WHERE post_artists.artist_id = artists.id
          AND posts.status = 'published'
        )`.as("article_count"),
          bio: artists.bio,
          claimed: artists.claimed,
          created_at: artists.createdAt,
          event_count: sql<number>`(
          SELECT COUNT(*)
          FROM event_artists
          INNER JOIN events ON event_artists.event_id = events.id
          WHERE event_artists.artist_id = artists.id
          AND events.status = 'published'
        )`.as("event_count"),
          genre: artists.genre,
          id: artists.id,
          image: artists.image,
          instagram: artists.instagram,
          location: artists.location,
          name: artists.name,
          phone_number: artists.phoneNumber,
          profile_views: artists.profileViews,
          slug: artists.slug,
          spotify_artist_id: artists.spotifyArtistId,
          spotify_url: artists.spotifyUrl,
          tiktok: artists.tiktok,
          twitter: artists.twitter,
          website: artists.website,
        })
        .from(artists)
        .where(eq(artists.id, updated.id))
        .limit(1);

      if (!artistWithCounts) {
        return c.json({ error: "Artist not found" }, 404);
      }

      return c.json({
        article_count: artistWithCounts.article_count || 0,
        bio: artistWithCounts.bio,
        claimed: artistWithCounts.claimed,
        created_at: artistWithCounts.created_at.toISOString(),
        event_count: artistWithCounts.event_count || 0,
        genre: artistWithCounts.genre,
        id: artistWithCounts.id,
        image: artistWithCounts.image,
        instagram: artistWithCounts.instagram,
        location: artistWithCounts.location,
        name: artistWithCounts.name,
        phone_number: artistWithCounts.phone_number,
        profile_views: artistWithCounts.profile_views,
        slug: artistWithCounts.slug,
        spotify_artist_id: artistWithCounts.spotify_artist_id,
        spotify_url: artistWithCounts.spotify_url,
        tiktok: artistWithCounts.tiktok,
        twitter: artistWithCounts.twitter,
        website: artistWithCounts.website,
      });
    } catch (error) {
      console.error("[api] update_current_user_artist:", error);
      return c.json({ error: "Failed to update artist" }, 500);
    }
  })
  .get("/:slug", zValidator("query", z.record(z.string(), z.string())), async (c) => {
    try {
      const slug = c.req.param("slug");
      const db = getDb(c.env);

      // Query artist with counts
      const [artist] = await db
        .select({
          article_count: sql<number>`(
          SELECT COUNT(*)
          FROM post_artists
          INNER JOIN posts ON post_artists.post_id = posts.id
          WHERE post_artists.artist_id = artists.id
          AND posts.status = 'published'
        )`.as("article_count"),
          bio: artists.bio,
          claimed: artists.claimed,
          created_at: artists.createdAt,
          event_count: sql<number>`(
          SELECT COUNT(*)
          FROM event_artists
          INNER JOIN events ON event_artists.event_id = events.id
          WHERE event_artists.artist_id = artists.id
          AND events.status = 'published'
        )`.as("event_count"),
          genre: artists.genre,
          hidden: artists.hidden,
          id: artists.id,
          image: artists.image,
          instagram: artists.instagram,
          location: artists.location,
          name: artists.name,
          profile_views: artists.profileViews,
          slug: artists.slug,
          spotify_artist_id: artists.spotifyArtistId,
          spotify_url: artists.spotifyUrl,
          tiktok: artists.tiktok,
          twitter: artists.twitter,
          website: artists.website,
        })
        .from(artists)
        .where(and(eq(artists.slug, slug), eq(artists.hidden, false)))
        .limit(1);

      if (!artist) {
        return c.json({ error: "Artist not found" }, 404);
      }

      // Transform to match existing Artist interface
      const artistData = {
        article_count: artist.article_count || 0,
        bio: artist.bio,
        claimed: artist.claimed,
        created_at: artist.created_at.toISOString(),
        event_count: artist.event_count || 0,
        genre: artist.genre,
        hidden: artist.hidden,
        id: artist.id,
        image: artist.image,
        instagram: artist.instagram,
        location: artist.location,
        name: artist.name,
        profile_views: artist.profile_views,
        slug: artist.slug,
        spotify_artist_id: artist.spotify_artist_id,
        spotify_url: artist.spotify_url,
        tiktok: artist.tiktok,
        twitter: artist.twitter,
        website: artist.website,
      };

      return c.json(artistData);
    } catch (error) {
      console.error("[api] fetch_artist:", error);
      return c.json({ error: "Failed to fetch artist" }, 500);
    }
  })
  .get("/:slug/articles", zValidator("query", z.record(z.string(), z.string())), async (c) => {
    try {
      const slug = c.req.param("slug");
      const db = getDb(c.env);

      // First get the artist by slug
      const [artist] = await db.select().from(artists).where(eq(artists.slug, slug)).limit(1);

      if (!artist) {
        return c.json({ error: "Artist not found" }, 404);
      }

      // Query posts joined with postArtists where artist matches and post is published
      const results = await db
        .select({
          author_email: users.email,
          author_first_name: users.firstName,
          author_id: posts.authorId,
          author_last_name: users.lastName,
          category: posts.category,
          cover_image: posts.coverImage,
          created_at: posts.createdAt,
          excerpt: posts.excerpt,
          id: posts.id,
          is_cover_story: posts.isCoverStory,
          published_at: posts.publishedAt,
          slug: posts.slug,
          title: posts.title,
          views: posts.views,
        })
        .from(posts)
        .innerJoin(postArtists, eq(posts.id, postArtists.postId))
        .leftJoin(users, eq(posts.authorId, users.clerkId))
        .where(and(eq(postArtists.artistId, artist.id), eq(posts.status, "published")))
        .orderBy(desc(posts.publishedAt));

      // Transform to match existing ArticleList interface
      const articles = results.map((post) => ({
        author: {
          id: post.author_id,
          name: resolveAuthorName(post.author_first_name, post.author_last_name, post.author_email),
        },
        category: post.category,
        cover_image: post.cover_image,
        created_at: post.created_at.toISOString(),
        excerpt: post.excerpt,
        id: post.id,
        is_cover_story: post.is_cover_story,
        published_at: post.published_at?.toISOString() || post.created_at.toISOString(),
        slug: post.slug,
        title: post.title,
        views: post.views,
      }));

      return c.json(articles);
    } catch (error) {
      console.error("[api] fetch_artist_articles:", error);
      return c.json({ error: "Failed to fetch artist articles" }, 500);
    }
  })
  .get("/:slug/events", zValidator("query", z.record(z.string(), z.string())), async (c) => {
    try {
      const slug = c.req.param("slug");
      const db = getDb(c.env);

      // First get the artist by slug
      const [artist] = await db.select().from(artists).where(eq(artists.slug, slug)).limit(1);

      if (!artist) {
        return c.json({ error: "Artist not found" }, 404);
      }

      // Query events joined with eventArtists where artist matches and event is published
      const results = await db
        .select({
          created_at: events.createdAt,
          date: events.date,
          description: events.description,
          genre: events.genre,
          id: events.id,
          image: events.image,
          location: events.location,
          price: events.price,
          slug: events.slug,
          ticket_link: events.ticketLink,
          time: events.time,
          title: events.title,
          venue: events.venue,
        })
        .from(events)
        .innerJoin(eventArtists, eq(events.id, eventArtists.eventId))
        .where(and(eq(eventArtists.artistId, artist.id), eq(events.status, "published")))
        .orderBy(desc(events.date));

      // Transform to match existing EventList interface
      const eventList = results.map((event) => ({
        id: event.id,
        title: event.title,
        slug: event.slug,
        description: event.description,
        image: event.image,
        venue: event.venue,
        location: event.location,
        date: event.date,
        time: event.time,
        ticket_link: event.ticket_link,
        price: event.price,
        genre: event.genre,
        // Would need to join to get all artists for this event
        artists: [],
        created_at: event.created_at.toISOString(),
      }));

      return c.json(eventList);
    } catch (error) {
      console.error("[api] fetch_artist_events:", error);
      return c.json({ error: "Failed to fetch artist events" }, 500);
    }
  });
