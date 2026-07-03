import { cacheLife, cacheTag } from "next/cache";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { ArticleList } from "@/lib/api/articles";
import { db } from "@/lib/db";
import { articleComments, artists, postArtists, posts, users } from "@/lib/db/schema";

const POST_CATEGORIES = ["COUNTRY", "EDM", "HARDCORE & ROCK", "HIP-HOP & R&B", "OTHER"] as const;

type PostCategory = (typeof POST_CATEGORIES)[number];

interface ListPublishedArticlesOptions {
  category?: string | null;
  coverStory?: boolean;
  limit?: number;
  offset?: number;
}

function isPostCategory(value: string): value is PostCategory {
  return POST_CATEGORIES.includes(value as PostCategory);
}

function normalizeLimit(value: number | undefined, fallback: number) {
  if (!Number.isFinite(value ?? Number.NaN) || (value ?? 0) < 1) {
    return fallback;
  }

  return Math.min(Math.trunc(value ?? fallback), 100);
}

function normalizeOffset(value: number | undefined) {
  if (!Number.isFinite(value ?? Number.NaN) || (value ?? 0) < 0) {
    return 0;
  }

  return Math.trunc(value ?? 0);
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

export async function listPublishedArticles({
  category,
  coverStory = false,
  limit,
  offset,
}: ListPublishedArticlesOptions = {}): Promise<ArticleList[]> {
  "use cache";
  cacheLife({
    expire: 3600,
    revalidate: 300,
    stale: 300,
  });
  cacheTag("posts");

  const normalizedLimit = normalizeLimit(limit, 10);
  const normalizedOffset = normalizeOffset(offset);
  const conditions = [eq(posts.status, "published")];

  if (category && isPostCategory(category)) {
    conditions.push(eq(posts.category, category));
  }
  if (coverStory) {
    conditions.push(eq(posts.isCoverStory, true));
  }

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
    .where(conditions.length > 1 ? and(...conditions) : conditions[0])
    .orderBy(desc(posts.publishedAt))
    .limit(normalizedLimit)
    .offset(normalizedOffset);

  const postIds = results.map((post) => post.id);
  const artistRelations: Record<
    number,
    {
      postId: number;
      artistId: number;
      artistSlug: string;
      artistName: string;
      artistImage: string | null;
    }[]
  > = {};
  const commentCountByPostId = new Map<number, number>();

  if (postIds.length > 0) {
    const [relations, commentCounts] = await Promise.all([
      db
        .select({
          artistId: artists.id,
          artistImage: artists.image,
          artistName: artists.name,
          artistSlug: artists.slug,
          postId: postArtists.postId,
        })
        .from(postArtists)
        .innerJoin(artists, eq(postArtists.artistId, artists.id))
        .where(inArray(postArtists.postId, postIds)),
      db
        .select({
          count: sql<number>`count(*)::int`.as("count"),
          postId: articleComments.postId,
        })
        .from(articleComments)
        .where(inArray(articleComments.postId, postIds))
        .groupBy(articleComments.postId),
    ]);

    for (const rel of relations) {
      if (!artistRelations[rel.postId]) {
        artistRelations[rel.postId] = [];
      }
      artistRelations[rel.postId].push(rel);
    }

    for (const row of commentCounts) {
      commentCountByPostId.set(row.postId, row.count);
    }
  }

  return results.map((post) => {
    const postArtistsData = artistRelations[post.id] || [];
    return {
      artists: postArtistsData.map((artist) => ({
        id: artist.artistId,
        image: artist.artistImage,
        name: artist.artistName,
        slug: artist.artistSlug,
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
    };
  });
}

export function parseArticleLimit(value: string | null) {
  return normalizeLimit(value ? Number.parseInt(value, 10) : undefined, 10);
}

export function parseArticleOffset(value: string | null) {
  return normalizeOffset(value ? Number.parseInt(value, 10) : undefined);
}
