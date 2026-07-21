import { db } from "@dpmedia/db";
import { eventArtmakers, events, posts } from "@dpmedia/db/schema";
import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { requireArtsStaff } from "#/lib/artmakers.functions.ts";
import { createSlug } from "#/lib/slug.ts";

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
  createdAt: Date;
}

export interface ArtsArticleListItem {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  coverImage: string | null;
  status: "draft" | "published" | "archived";
  publishedAt: Date | null;
  tags: string[] | null;
  authorId: string;
  createdAt: Date;
}

export const listArtsEvents = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const rows = await db
      .select({
        createdAt: events.createdAt,
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

export const listArtsAdminEvents = createServerFn({ method: "GET" }).handler(async () => {
  await requireArtsStaff();
  const rows = await db
    .select({
      createdAt: events.createdAt,
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
    .where(eq(events.vertical, "arts"))
    .orderBy(desc(events.createdAt));

  return rows satisfies ArtsEventListItem[];
});

export const listArtsArticles = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const rows = await db
      .select({
        authorId: posts.authorId,
        content: posts.content,
        coverImage: posts.coverImage,
        createdAt: posts.createdAt,
        excerpt: posts.excerpt,
        id: posts.id,
        publishedAt: posts.publishedAt,
        slug: posts.slug,
        status: posts.status,
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

export const listArtsAdminArticles = createServerFn({ method: "GET" }).handler(async () => {
  await requireArtsStaff();
  const rows = await db
    .select({
      authorId: posts.authorId,
      content: posts.content,
      coverImage: posts.coverImage,
      createdAt: posts.createdAt,
      excerpt: posts.excerpt,
      id: posts.id,
      publishedAt: posts.publishedAt,
      slug: posts.slug,
      status: posts.status,
      tags: posts.tags,
      title: posts.title,
    })
    .from(posts)
    .where(eq(posts.vertical, "arts"))
    .orderBy(desc(posts.createdAt));

  return rows satisfies ArtsArticleListItem[];
});

export const createArtsArticle = createServerFn({ method: "POST" })
  .validator(
    z.object({
      content: z.string().min(1, "Content is required"),
      coverImage: z.string().optional(),
      excerpt: z.string().min(1, "Excerpt is required"),
      status: z.enum(["draft", "published", "archived"]).default("published"),
      title: z.string().min(1, "Title is required"),
    }),
  )
  .handler(async ({ data }) => {
    const staff = await requireArtsStaff();
    const baseSlug = createSlug(data.title);

    let slug = baseSlug;
    let counter = 1;
    while (true) {
      const existing = await db.select({ id: posts.id }).from(posts).where(eq(posts.slug, slug));
      if (existing.length === 0) {
        break;
      }
      counter += 1;
      slug = `${baseSlug}-${counter}`;
    }

    const [created] = await db
      .insert(posts)
      .values({
        authorId: staff.clerkUserId,
        category: "OTHER",
        content: data.content,
        coverImage: data.coverImage || null,
        excerpt: data.excerpt,
        publishedAt: data.status === "published" ? new Date() : null,
        slug,
        status: data.status,
        title: data.title,
        vertical: "arts",
      })
      .returning();

    return { article: created, success: true };
  });

export const updateArtsArticle = createServerFn({ method: "POST" })
  .validator(
    z.object({
      content: z.string().min(1, "Content is required"),
      coverImage: z.string().optional(),
      excerpt: z.string().min(1, "Excerpt is required"),
      id: z.number(),
      status: z.enum(["draft", "published", "archived"]),
      title: z.string().min(1, "Title is required"),
    }),
  )
  .handler(async ({ data }) => {
    await requireArtsStaff();
    const [existing] = await db.select().from(posts).where(eq(posts.id, data.id));
    if (!existing) {
      throw new Error("Article not found");
    }

    const publishedAt =
      data.status === "published" && !existing.publishedAt ? new Date() : existing.publishedAt;

    const [updated] = await db
      .update(posts)
      .set({
        content: data.content,
        coverImage: data.coverImage || null,
        excerpt: data.excerpt,
        publishedAt,
        status: data.status,
        title: data.title,
        updatedAt: new Date(),
      })
      .where(eq(posts.id, data.id))
      .returning();

    return { article: updated, success: true };
  });

export const toggleArtsArticleStatus = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.number() }))
  .handler(async ({ data }) => {
    await requireArtsStaff();
    const [existing] = await db.select().from(posts).where(eq(posts.id, data.id));
    if (!existing) {
      throw new Error("Article not found");
    }

    const nextStatus = existing.status === "published" ? "draft" : "published";
    const publishedAt = nextStatus === "published" ? new Date() : existing.publishedAt;

    const [updated] = await db
      .update(posts)
      .set({
        publishedAt,
        status: nextStatus,
        updatedAt: new Date(),
      })
      .where(eq(posts.id, data.id))
      .returning();

    return { article: updated, success: true };
  });

export const deleteArtsArticle = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.number() }))
  .handler(async ({ data }) => {
    await requireArtsStaff();
    await db.delete(posts).where(eq(posts.id, data.id));
    return { success: true };
  });

export const createArtsEvent = createServerFn({ method: "POST" })
  .validator(
    z.object({
      artmakerIds: z.array(z.number()).optional(),
      date: z.string().min(1, "Date is required"),
      description: z.string().min(1, "Description is required"),
      genre: z
        .enum(["COUNTRY", "EDM", "HARDCORE & ROCK", "HIP-HOP & R&B", "OTHER"])
        .default("OTHER"),
      image: z.string().optional(),
      location: z.string().min(1, "Location is required"),
      price: z.string().optional(),
      status: z.enum(["draft", "published", "past"]).default("published"),
      ticketLink: z.string().optional(),
      time: z.string().optional(),
      title: z.string().min(1, "Title is required"),
      venue: z.string().min(1, "Venue is required"),
    }),
  )
  .handler(async ({ data }) => {
    const staff = await requireArtsStaff();
    const baseSlug = createSlug(data.title);

    let slug = baseSlug;
    let counter = 1;
    while (true) {
      const existing = await db.select({ id: events.id }).from(events).where(eq(events.slug, slug));
      if (existing.length === 0) {
        break;
      }
      counter += 1;
      slug = `${baseSlug}-${counter}`;
    }

    const [created] = await db
      .insert(events)
      .values({
        createdById: staff.clerkUserId,
        date: data.date,
        description: data.description,
        genre: data.genre,
        image: data.image || null,
        location: data.location,
        price: data.price || null,
        slug,
        status: data.status,
        ticketLink: data.ticketLink || null,
        time: data.time || null,
        title: data.title,
        venue: data.venue,
        vertical: "arts",
      })
      .returning();

    if (data.artmakerIds?.length) {
      await db.insert(eventArtmakers).values(
        data.artmakerIds.map((artmakerId) => ({
          artmakerId,
          eventId: created.id,
        })),
      );
    }

    return { event: created, success: true };
  });

export const toggleArtsEventStatus = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.number() }))
  .handler(async ({ data }) => {
    await requireArtsStaff();
    const [existing] = await db.select().from(events).where(eq(events.id, data.id));
    if (!existing) {
      throw new Error("Event not found");
    }

    const nextStatus = existing.status === "published" ? "draft" : "published";

    const [updated] = await db
      .update(events)
      .set({
        status: nextStatus,
        updatedAt: new Date(),
      })
      .where(eq(events.id, data.id))
      .returning();

    return { event: updated, success: true };
  });

export const deleteArtsEvent = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.number() }))
  .handler(async ({ data }) => {
    await requireArtsStaff();
    await db.delete(events).where(eq(events.id, data.id));
    return { success: true };
  });
