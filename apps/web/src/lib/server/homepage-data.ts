import { db } from "@/lib/db";
import {
  articleComments,
  artists,
  eventArtists,
  events,
  musicReleases,
  postArtists,
  posts,
  users,
} from "@/lib/db/schema";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { ArticleList } from "@/lib/api/articles";
import type { EventList } from "@/lib/api/events";

const POST_CATEGORIES = ["COUNTRY", "EDM", "HARDCORE & ROCK", "HIP-HOP & R&B", "OTHER"] as const;

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

/**
 * Server-side equivalent of GET /api/posts (published posts with author,
 * artist relations, and comment counts). Used by the homepage server
 * component so the initial HTML contains real content.
 */
export async function fetchHomepageArticles(limit = 100): Promise<ArticleList[]> {
  const results = await db
    .select({
      authorEmail: users.email,
      authorFirstName: users.firstName,
      authorId: posts.authorId,
      authorLastName: users.lastName,
      category: posts.category,
      coverImage: posts.coverImage,
      createdAt: posts.createdAt,
      excerpt: posts.excerpt,
      id: posts.id,
      isCoverStory: posts.isCoverStory,
      publishedAt: posts.publishedAt,
      slug: posts.slug,
      status: posts.status,
      tags: posts.tags,
      title: posts.title,
      updatedAt: posts.updatedAt,
      views: posts.views,
    })
    .from(posts)
    .leftJoin(users, eq(posts.authorId, users.clerkId))
    .where(eq(posts.status, "published"))
    .orderBy(desc(posts.publishedAt))
    .limit(limit);

  const postIds = results.map((post) => post.id);
  const artistRelations: Record<
    number,
    { artistId: number; artistImage: string | null; artistName: string; artistSlug: string }[]
  > = {};
  const commentCountByPostId = new Map<number, number>();

  if (postIds.length > 0) {
    const relations = await db
      .select({
        artistId: artists.id,
        artistImage: artists.image,
        artistName: artists.name,
        artistSlug: artists.slug,
        postId: postArtists.postId,
      })
      .from(postArtists)
      .innerJoin(artists, eq(postArtists.artistId, artists.id))
      .where(inArray(postArtists.postId, postIds));

    for (const rel of relations) {
      artistRelations[rel.postId] = artistRelations[rel.postId] ?? [];
      artistRelations[rel.postId].push(rel);
    }

    const commentCounts = await db
      .select({
        count: sql<number>`count(*)::int`.as("count"),
        postId: articleComments.postId,
      })
      .from(articleComments)
      .where(inArray(articleComments.postId, postIds))
      .groupBy(articleComments.postId);

    for (const row of commentCounts) {
      commentCountByPostId.set(row.postId, row.count);
    }
  }

  return results.map((post) => ({
    artists: (artistRelations[post.id] ?? []).map((a) => ({
      id: a.artistId,
      image: a.artistImage,
      name: a.artistName,
      slug: a.artistSlug,
    })),
    author: {
      id: post.authorId,
      name: resolveAuthorName(post.authorFirstName, post.authorLastName, post.authorEmail),
    },
    category: post.category,
    comment_count: commentCountByPostId.get(post.id) ?? 0,
    cover_image: post.coverImage ?? "",
    created_at: post.createdAt.toISOString(),
    excerpt: post.excerpt,
    id: post.id,
    is_cover_story: post.isCoverStory,
    published_at: post.publishedAt?.toISOString() || post.createdAt.toISOString(),
    slug: post.slug,
    tags: post.tags ?? [],
    title: post.title,
    views: post.views,
  }));
}

/**
 * Server-side equivalent of GET /api/events (published events with artist
 * relations, newest first).
 */
export async function fetchHomepageEvents(limit = 100): Promise<EventList[]> {
  const results = await db
    .select()
    .from(events)
    .where(eq(events.status, "published"))
    .orderBy(desc(events.date))
    .limit(limit);

  const eventIds = results.map((event) => event.id);
  const artistRelations: Record<
    number,
    { artistId: number; artistImage: string | null; artistName: string; artistSlug: string }[]
  > = {};

  if (eventIds.length > 0) {
    const relations = await db
      .select({
        artistId: artists.id,
        artistImage: artists.image,
        artistName: artists.name,
        artistSlug: artists.slug,
        eventId: eventArtists.eventId,
      })
      .from(eventArtists)
      .innerJoin(artists, eq(eventArtists.artistId, artists.id))
      .where(inArray(eventArtists.eventId, eventIds));

    for (const rel of relations) {
      artistRelations[rel.eventId] = artistRelations[rel.eventId] ?? [];
      artistRelations[rel.eventId].push(rel);
    }
  }

  return results.map((event) => ({
    artists: (artistRelations[event.id] ?? []).map((a) => ({
      id: a.artistId,
      image: a.artistImage,
      name: a.artistName,
      slug: a.artistSlug,
    })),
    created_at: event.createdAt.toISOString(),
    date: event.date,
    description: event.description,
    genre: event.genre,
    id: event.id,
    image: event.image ?? "",
    location: event.location,
    price: event.price,
    slug: event.slug,
    ticket_link: event.ticketLink,
    time: event.time ?? "",
    title: event.title,
    venue: event.venue,
  }));
}

export interface HomepageMusicRelease {
  appleMusicUrl: string | null;
  artistName: string;
  artistSlug: string | null;
  bandcampUrl: string | null;
  coverArt: string | null;
  excerpt: string | null;
  genre: string;
  id: number;
  releaseDate: string | null;
  releaseType: string;
  slug: string;
  spotifyUrl: string | null;
  title: string;
}

export async function fetchHomepageMusicReleases(limit = 10): Promise<HomepageMusicRelease[]> {
  const rows = await db
    .select({
      appleMusicUrl: musicReleases.appleMusicUrl,
      artistName: musicReleases.artistName,
      bandcampUrl: musicReleases.bandcampUrl,
      coverArt: musicReleases.coverArt,
      excerpt: musicReleases.excerpt,
      genre: musicReleases.genre,
      id: musicReleases.id,
      releaseDate: musicReleases.releaseDate,
      releaseType: musicReleases.releaseType,
      slug: musicReleases.slug,
      spotifyUrl: musicReleases.spotifyUrl,
      title: musicReleases.title,
      artistSlug: artists.slug,
    })
    .from(musicReleases)
    .leftJoin(artists, eq(musicReleases.artistId, artists.id))
    .where(eq(musicReleases.status, "published"))
    .orderBy(desc(musicReleases.releaseDate))
    .limit(limit);

  return rows.map((row) => ({
    appleMusicUrl: row.appleMusicUrl,
    artistName: row.artistName,
    artistSlug: row.artistSlug,
    bandcampUrl: row.bandcampUrl,
    coverArt: row.coverArt,
    excerpt: row.excerpt,
    genre: row.genre,
    id: row.id,
    releaseDate: row.releaseDate,
    releaseType: row.releaseType,
    slug: row.slug,
    spotifyUrl: row.spotifyUrl,
    title: row.title,
  }));
}
