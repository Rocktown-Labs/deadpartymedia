import { db } from "@dpmedia/db";
import { events, posts } from "@dpmedia/db/schema";
import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq } from "drizzle-orm";

export interface ArtsEventListItem {
  id: number;
  slug: string;
  title: string;
  description: string;
  image: string | null;
  venue: string;
  location: string;
  date: string;
  time: string | null;
  ticketLink: string | null;
  price: string | null;
  status: "draft" | "published" | "past";
}

export interface ArtsArticleListItem {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  coverImage: string | null;
  publishedAt: Date | null;
  tags: string[] | null;
}

export const listArtsEvents = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const rows = await db
      .select({
        date: events.date,
        description: events.description,
        id: events.id,
        image: events.image,
        location: events.location,
        price: events.price,
        slug: events.slug,
        status: events.status,
        ticketLink: events.ticketLink,
        time: events.time,
        title: events.title,
        venue: events.venue,
      })
      .from(events)
      .where(and(eq(events.vertical, "arts"), eq(events.status, "published")))
      .orderBy(events.date);

    return rows satisfies ArtsEventListItem[];
  } catch {
    return [] satisfies ArtsEventListItem[];
  }
});

export const listArtsArticles = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const rows = await db
      .select({
        coverImage: posts.coverImage,
        excerpt: posts.excerpt,
        id: posts.id,
        publishedAt: posts.publishedAt,
        slug: posts.slug,
        tags: posts.tags,
        title: posts.title,
      })
      .from(posts)
      .where(and(eq(posts.vertical, "arts"), eq(posts.status, "published")))
      .orderBy(desc(posts.publishedAt));

    return rows satisfies ArtsArticleListItem[];
  } catch {
    return [] satisfies ArtsArticleListItem[];
  }
});
