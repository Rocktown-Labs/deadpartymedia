import { generateHTML } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { Hono } from "hono";
import { articleComments, artists, postArtists, posts, users } from "@dpmedia/db/schema";
import { getDb } from "../../db";
import { normalizeStoredPostContent } from "../../lib/post-content";
import { clampInt } from "../../lib/security";
import type { AppEnv } from "../../bindings";

/**
 * Ported from apps/web/src/app/api/posts/route.ts and
 * apps/web/src/app/api/posts/[slug]/route.ts.
 * Response shapes are identical to the Next.js routes so the web app's
 * react-query hooks keep working.
 */
export const musicPostsRoutes = new Hono<AppEnv>();

const POST_CATEGORIES = ["COUNTRY", "EDM", "HARDCORE & ROCK", "HIP-HOP & R&B", "OTHER"] as const;

type PostCategory = (typeof POST_CATEGORIES)[number];

function isPostCategory(value: string): value is PostCategory {
  return POST_CATEGORIES.includes(value as PostCategory);
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

musicPostsRoutes.get("/", async (c) => {
  try {
    const db = getDb(c.env);
    const category = c.req.query("category");
    const limit = clampInt(c.req.query("limit"), 50, 1, 200);
    const offset = clampInt(c.req.query("offset"), 0, 0, 100_000);
    const coverStory = c.req.query("cover_story") === "true";

    // Build where conditions
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
      .limit(limit)
      .offset(offset);

    // Get artist relations for all posts
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

      // Group by postId
      for (const rel of relations) {
        const bucket = artistRelations[rel.postId] ?? [];
        bucket.push(rel);
        artistRelations[rel.postId] = bucket;
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

    // Transform to match existing ArticleList interface
    const articles = results.map((post) => {
      const postArtistsData = artistRelations[post.id] || [];
      return {
        artists: postArtistsData.map((a) => ({
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
        cover_image: post.coverImage,
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

    return c.json(
      {
        count: articles.length,
        results: articles,
      },
      200,
      {
        "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=300",
      },
    );
  } catch (error) {
    console.error("[api] fetch_posts:", error);
    return c.json({ error: "Failed to fetch posts" }, 500);
  }
});

musicPostsRoutes.get("/:slug", async (c) => {
  try {
    const db = getDb(c.env);
    const slug = c.req.param("slug");

    const [row] = await db
      .select({
        authorEmail: users.email,
        authorFirstName: users.firstName,
        authorId: posts.authorId,
        authorLastName: users.lastName,
        category: posts.category,
        content: posts.content,
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
      .where(and(eq(posts.slug, slug), eq(posts.status, "published")))
      .limit(1);

    const post = row;
    if (!post) {
      return c.json({ error: "Post not found" }, 404);
    }

    // Get artist relations for this post
    const postArtistsData = await db
      .select({
        id: artists.id,
        image: artists.image,
        name: artists.name,
        slug: artists.slug,
        bio: artists.bio,
        location: artists.location,
        genre: artists.genre,
        spotifyUrl: artists.spotifyUrl,
        spotifyArtistId: artists.spotifyArtistId,
      })
      .from(postArtists)
      .innerJoin(artists, eq(postArtists.artistId, artists.id))
      .where(eq(postArtists.postId, post.id));

    const [commentCountResult] = await db
      .select({ count: sql<number>`count(*)::int`.as("count") })
      .from(articleComments)
      .where(eq(articleComments.postId, post.id));

    // Normalize stored content and convert to HTML when TipTap JSON is present.
    const normalizedContent = normalizeStoredPostContent(post.content);
    const content = normalizedContent.tiptapDoc
      ? generateHTML(normalizedContent.tiptapDoc, [
          StarterKit,
          Image,
          Link.configure({
            HTMLAttributes: {
              class: "text-red-500 hover:text-red-400 underline font-medium cursor-pointer",
            },
          }),
        ])
      : post.content;

    // Transform to match existing Article interface
    const article = {
      artists: postArtistsData,
      author: {
        id: post.authorId,
        name: resolveAuthorName(post.authorFirstName, post.authorLastName, post.authorEmail),
      },
      category: post.category,
      comment_count: commentCountResult?.count ?? 0,
      content,
      cover_image: post.coverImage,
      created_at: post.createdAt.toISOString(),
      excerpt: post.excerpt,
      id: post.id,
      is_cover_story: post.isCoverStory,
      published_at: post.publishedAt?.toISOString() || post.createdAt.toISOString(),
      slug: post.slug,
      tags: post.tags ?? [],
      title: post.title,
      updated_at: post.updatedAt.toISOString(),
      views: post.views,
    };

    return c.json(article);
  } catch (error) {
    console.error("[api] fetch_post:", error);
    return c.json({ error: "Failed to fetch post" }, 500);
  }
});
