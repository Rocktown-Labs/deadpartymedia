import { db } from "@dpmedia/db";
import { artmakers, eventArtmakers, events, postArtmakers, posts } from "@dpmedia/db/schema";
import { auth } from "@clerk/tanstack-react-start/server";
import { createServerFn } from "@tanstack/react-start";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { requireArtsStaff } from "#/lib/artmakers.functions.ts";
import { isArtsAdminRole } from "#/lib/roles.ts";
import { createSlug } from "#/lib/slug.ts";
import { normalizeStoredImageUrl } from "#/lib/upload.ts";

type ArtsApi = typeof import("#/lib/api-proxy.ts");

let artsApiPromise: Promise<ArtsApi> | null = null;

/**
 * Load the API proxy lazily. api-proxy.ts statically imports
 * `@tanstack/react-start/server`, which re-exports
 * `@tanstack/start-server-core`; its `#tanstack-*` subpath imports only
 * resolve under the full TanStack Start build plugin (disabled under
 * VITEST), so an eager top-level import would break unit tests that load
 * this module. Handlers never run in those tests.
 */
function loadArtsApi(): Promise<ArtsApi> {
  artsApiPromise ??= import("#/lib/api-proxy.ts");
  return artsApiPromise;
}

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
  artmakerIds: number[];
  artmakers: {
    id: number;
    name: string;
    slug: string;
  }[];
}

interface ApiArtsEventListItem extends Omit<ArtsEventListItem, "createdAt"> {
  createdAt: string;
}

/** Revive Date fields the API serializes as ISO strings. */
function reviveEvent(item: ApiArtsEventListItem): ArtsEventListItem {
  return { ...item, createdAt: new Date(item.createdAt) };
}

interface ApiArtsArticleListItem extends Omit<ArtsArticleListItem, "publishedAt" | "createdAt"> {
  publishedAt: string | null;
  createdAt: string;
}

function reviveArticle(item: ApiArtsArticleListItem): ArtsArticleListItem {
  return {
    ...item,
    createdAt: new Date(item.createdAt),
    publishedAt: item.publishedAt ? new Date(item.publishedAt) : null,
  };
}

interface ApiPostRow extends Omit<
  typeof posts.$inferSelect,
  "createdAt" | "updatedAt" | "publishedAt" | "deleteRequestedAt"
> {
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  deleteRequestedAt: string | null;
}

function revivePostRow(row: ApiPostRow): typeof posts.$inferSelect {
  return {
    ...row,
    createdAt: new Date(row.createdAt),
    deleteRequestedAt: row.deleteRequestedAt ? new Date(row.deleteRequestedAt) : null,
    publishedAt: row.publishedAt ? new Date(row.publishedAt) : null,
    updatedAt: new Date(row.updatedAt),
  };
}

interface ApiEventRow extends Omit<typeof events.$inferSelect, "createdAt" | "updatedAt"> {
  createdAt: string;
  updatedAt: string;
}

function reviveEventRow(row: ApiEventRow): typeof events.$inferSelect {
  return {
    ...row,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  };
}

export const listArtsEvents = createServerFn({ method: "GET" }).handler(async () => {
  // Phase 1 flip: proxy to the platform API when configured.
  const { artsApiConfigured, artsApiFetch } = await loadArtsApi();
  if (artsApiConfigured()) {
    try {
      const response = await artsApiFetch("/arts/events");
      if (!response.ok) {
        return [] satisfies ArtsEventListItem[];
      }
      const rows = (await response.json()) as ApiArtsEventListItem[];
      return rows.map(reviveEvent) satisfies ArtsEventListItem[];
    } catch {
      return [] satisfies ArtsEventListItem[];
    }
  }

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

    return rows.map((row) => ({
      ...row,
      image: normalizeStoredImageUrl(row.image),
    })) satisfies ArtsEventListItem[];
  } catch {
    return [] satisfies ArtsEventListItem[];
  }
});

export const listArtsAdminEvents = createServerFn({ method: "GET" }).handler(async () => {
  await requireArtsStaff();

  // Phase 1 flip: proxy to the platform API when configured.
  const { artsApiConfigured, artsApiFetch } = await loadArtsApi();
  if (artsApiConfigured()) {
    const response = await artsApiFetch("/arts/admin/events");
    if (!response.ok) {
      throw new Error(`Failed to load events (API ${response.status})`);
    }
    const rows = (await response.json()) as ApiArtsEventListItem[];
    return rows.map(reviveEvent) satisfies ArtsEventListItem[];
  }

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

  return rows.map((row) => ({
    ...row,
    image: normalizeStoredImageUrl(row.image),
  })) satisfies ArtsEventListItem[];
});

export const listArtsArticles = createServerFn({ method: "GET" }).handler(async () => {
  // Phase 1 flip: proxy to the platform API when configured.
  const { artsApiConfigured, artsApiFetch } = await loadArtsApi();
  if (artsApiConfigured()) {
    try {
      const response = await artsApiFetch("/arts/articles");
      if (!response.ok) {
        return [] satisfies ArtsArticleListItem[];
      }
      const rows = (await response.json()) as ApiArtsArticleListItem[];
      return rows.map(reviveArticle) satisfies ArtsArticleListItem[];
    } catch {
      return [] satisfies ArtsArticleListItem[];
    }
  }

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

    const links = rows.length
      ? await db
          .select({
            artmakerId: postArtmakers.artmakerId,
            name: artmakers.name,
            postId: postArtmakers.postId,
            slug: artmakers.slug,
          })
          .from(postArtmakers)
          .innerJoin(artmakers, eq(postArtmakers.artmakerId, artmakers.id))
          .where(
            inArray(
              postArtmakers.postId,
              rows.map((row) => row.id),
            ),
          )
      : [];

    return rows.map((row) => {
      const rowLinks = links.filter((link) => link.postId === row.id);
      return {
        ...row,
        coverImage: normalizeStoredImageUrl(row.coverImage),
        artmakerIds: rowLinks.map((link) => link.artmakerId),
        artmakers: rowLinks.map((link) => ({
          id: link.artmakerId,
          name: link.name,
          slug: link.slug,
        })),
      };
    }) satisfies ArtsArticleListItem[];
  } catch {
    return [] satisfies ArtsArticleListItem[];
  }
});

export const listArtsAdminArticles = createServerFn({ method: "GET" }).handler(async () => {
  const staff = await requireArtsStaff();

  // Phase 1 flip: proxy to the platform API when configured. The API
  // applies the same writer/admin scoping from the verified session.
  const { artsApiConfigured, artsApiFetch } = await loadArtsApi();
  if (artsApiConfigured()) {
    const response = await artsApiFetch("/arts/admin/articles");
    if (!response.ok) {
      throw new Error(`Failed to load articles (API ${response.status})`);
    }
    const rows = (await response.json()) as ApiArtsArticleListItem[];
    return rows.map(reviveArticle) satisfies ArtsArticleListItem[];
  }

  const isSuperOrAdmin = staff.roles.some((r) => isArtsAdminRole(r)) || isArtsAdminRole(staff.role);
  const whereClause = isSuperOrAdmin
    ? eq(posts.vertical, "arts")
    : and(eq(posts.vertical, "arts"), eq(posts.authorId, staff.userId));

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
    .where(whereClause)
    .orderBy(desc(posts.createdAt));

  const links = rows.length
    ? await db
        .select({
          artmakerId: postArtmakers.artmakerId,
          name: artmakers.name,
          postId: postArtmakers.postId,
          slug: artmakers.slug,
        })
        .from(postArtmakers)
        .innerJoin(artmakers, eq(postArtmakers.artmakerId, artmakers.id))
        .where(
          inArray(
            postArtmakers.postId,
            rows.map((row) => row.id),
          ),
        )
    : [];

  return rows.map((row) => {
    const rowLinks = links.filter((link) => link.postId === row.id);
    return {
      ...row,
      coverImage: normalizeStoredImageUrl(row.coverImage),
      artmakerIds: rowLinks.map((link) => link.artmakerId),
      artmakers: rowLinks.map((link) => ({
        id: link.artmakerId,
        name: link.name,
        slug: link.slug,
      })),
    };
  }) satisfies ArtsArticleListItem[];
});

export const createArtsArticle = createServerFn({ method: "POST" })
  .validator(
    z.object({
      content: z.string().min(1, "Content is required"),
      artmakerIds: z.array(z.number()).optional(),
      coverImage: z.string().optional(),
      excerpt: z.string().min(1, "Excerpt is required"),
      status: z.enum(["draft", "published", "archived"]).default("published"),
      title: z.string().min(1, "Title is required"),
    }),
  )
  .handler(async ({ data }) => {
    const staff = await requireArtsStaff();

    // Phase 1 flip: proxy to the platform API when configured.
    const { artsApiConfigured, artsApiFetch } = await loadArtsApi();
    if (artsApiConfigured()) {
      const response = await artsApiFetch("/arts/admin/articles", {
        json: data,
        method: "POST",
      });
      if (!response.ok) {
        throw new Error(`Failed to create article (API ${response.status})`);
      }
      const result = (await response.json()) as { article: ApiPostRow; success: boolean };
      return { article: revivePostRow(result.article), success: true };
    }

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
        authorId: staff.userId,
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

    if (data.artmakerIds?.length) {
      await db.insert(postArtmakers).values(
        data.artmakerIds.map((artmakerId) => ({
          artmakerId,
          postId: created.id,
        })),
      );
    }

    return { article: created, success: true };
  });

export const updateArtsArticle = createServerFn({ method: "POST" })
  .validator(
    z.object({
      content: z.string().min(1, "Content is required"),
      artmakerIds: z.array(z.number()).optional(),
      coverImage: z.string().optional(),
      excerpt: z.string().min(1, "Excerpt is required"),
      id: z.number(),
      status: z.enum(["draft", "published", "archived"]),
      title: z.string().min(1, "Title is required"),
    }),
  )
  .handler(async ({ data }) => {
    const staff = await requireArtsStaff();

    // Phase 1 flip: proxy to the platform API when configured.
    const { artsApiConfigured, artsApiFetch } = await loadArtsApi();
    if (artsApiConfigured()) {
      const response = await artsApiFetch(`/arts/admin/articles/${data.id}`, {
        json: data,
        method: "PATCH",
      });
      if (response.status === 404) {
        throw new Error("Article not found");
      }
      if (response.status === 403) {
        throw new Error("Unauthorized: You don't have permission to edit this article");
      }
      if (!response.ok) {
        throw new Error(`Failed to update article (API ${response.status})`);
      }
      const result = (await response.json()) as { article: ApiPostRow; success: boolean };
      return { article: revivePostRow(result.article), success: true };
    }

    const [existing] = await db
      .select()
      .from(posts)
      .where(and(eq(posts.id, data.id), eq(posts.vertical, "arts")));
    if (!existing) {
      throw new Error("Article not found");
    }

    const isSuperOrAdmin =
      staff.roles.some((r) => isArtsAdminRole(r)) || isArtsAdminRole(staff.role);
    if (!isSuperOrAdmin && existing.authorId !== staff.userId) {
      throw new Error("Unauthorized: You don't have permission to edit this article");
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
      .where(and(eq(posts.id, data.id), eq(posts.vertical, "arts")))
      .returning();

    await db.delete(postArtmakers).where(eq(postArtmakers.postId, data.id));

    if (data.artmakerIds?.length) {
      await db.insert(postArtmakers).values(
        data.artmakerIds.map((artmakerId) => ({
          artmakerId,
          postId: data.id,
        })),
      );
    }

    return { article: updated, success: true };
  });

export const toggleArtsArticleStatus = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.number() }))
  .handler(async ({ data }) => {
    const staff = await requireArtsStaff();

    // Phase 1 flip: proxy to the platform API when configured.
    const { artsApiConfigured, artsApiFetch } = await loadArtsApi();
    if (artsApiConfigured()) {
      const response = await artsApiFetch(`/arts/admin/articles/${data.id}/toggle`, {
        method: "POST",
      });
      if (response.status === 404) {
        throw new Error("Article not found");
      }
      if (response.status === 403) {
        throw new Error("Unauthorized: You don't have permission to edit this article");
      }
      if (!response.ok) {
        throw new Error(`Failed to toggle article status (API ${response.status})`);
      }
      const result = (await response.json()) as { article: ApiPostRow; success: boolean };
      return { article: revivePostRow(result.article), success: true };
    }

    const [existing] = await db
      .select()
      .from(posts)
      .where(and(eq(posts.id, data.id), eq(posts.vertical, "arts")));
    if (!existing) {
      throw new Error("Article not found");
    }

    const isSuperOrAdmin =
      staff.roles.some((r) => isArtsAdminRole(r)) || isArtsAdminRole(staff.role);
    if (!isSuperOrAdmin && existing.authorId !== staff.userId) {
      throw new Error("Unauthorized: You don't have permission to edit this article");
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
      .where(and(eq(posts.id, data.id), eq(posts.vertical, "arts")))
      .returning();

    return { article: updated, success: true };
  });

export const deleteArtsArticle = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.number() }))
  .handler(async ({ data }) => {
    const staff = await requireArtsStaff();

    // Phase 1 flip: proxy to the platform API when configured.
    const { artsApiConfigured, artsApiFetch } = await loadArtsApi();
    if (artsApiConfigured()) {
      const response = await artsApiFetch(`/arts/admin/articles/${data.id}`, {
        method: "DELETE",
      });
      if (response.status === 404) {
        throw new Error("Article not found");
      }
      if (response.status === 403) {
        throw new Error("Unauthorized: You don't have permission to delete this article");
      }
      if (!response.ok) {
        throw new Error(`Failed to delete article (API ${response.status})`);
      }
      return { success: true };
    }

    const [existing] = await db
      .select({ authorId: posts.authorId, id: posts.id })
      .from(posts)
      .where(and(eq(posts.id, data.id), eq(posts.vertical, "arts")));
    if (!existing) {
      throw new Error("Article not found");
    }

    const isSuperOrAdmin =
      staff.roles.some((r) => isArtsAdminRole(r)) || isArtsAdminRole(staff.role);
    if (!isSuperOrAdmin && existing.authorId !== staff.userId) {
      throw new Error("Unauthorized: You don't have permission to delete this article");
    }

    await db.delete(postArtmakers).where(eq(postArtmakers.postId, data.id));
    await db.delete(posts).where(and(eq(posts.id, data.id), eq(posts.vertical, "arts")));
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

    // Phase 1 flip: proxy to the platform API when configured.
    const { artsApiConfigured, artsApiFetch } = await loadArtsApi();
    if (artsApiConfigured()) {
      const response = await artsApiFetch("/arts/admin/events", {
        json: data,
        method: "POST",
      });
      if (!response.ok) {
        throw new Error(`Failed to create event (API ${response.status})`);
      }
      const result = (await response.json()) as { event: ApiEventRow; success: boolean };
      return { event: reviveEventRow(result.event), success: true };
    }

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
        createdById: staff.userId,
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

    // Phase 1 flip: proxy to the platform API when configured.
    const { artsApiConfigured, artsApiFetch } = await loadArtsApi();
    if (artsApiConfigured()) {
      const response = await artsApiFetch(`/arts/admin/events/${data.id}/toggle`, {
        method: "POST",
      });
      if (response.status === 404) {
        throw new Error("Event not found");
      }
      if (!response.ok) {
        throw new Error(`Failed to toggle event status (API ${response.status})`);
      }
      const result = (await response.json()) as { event: ApiEventRow; success: boolean };
      return { event: reviveEventRow(result.event), success: true };
    }

    const [existing] = await db
      .select()
      .from(events)
      .where(and(eq(events.id, data.id), eq(events.vertical, "arts")));
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
      .where(and(eq(events.id, data.id), eq(events.vertical, "arts")))
      .returning();

    return { event: updated, success: true };
  });

export const deleteArtsEvent = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.number() }))
  .handler(async ({ data }) => {
    await requireArtsStaff();

    // Phase 1 flip: proxy to the platform API when configured.
    const { artsApiConfigured, artsApiFetch } = await loadArtsApi();
    if (artsApiConfigured()) {
      const response = await artsApiFetch(`/arts/admin/events/${data.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error(`Failed to delete event (API ${response.status})`);
      }
      return { success: true };
    }

    await db.delete(events).where(and(eq(events.id, data.id), eq(events.vertical, "arts")));
    return { success: true };
  });

// Events the signed-in artmaker is tagged on. Published only, deduped, with
// an `upcoming` flag the Studio events page splits into "Upcoming" and "Past"
// sections (issue #133).
export const listTaggedEventsForCurrentArtmaker = createServerFn({ method: "GET" }).handler(
  async () => {
    // Phase 1 flip: proxy to the platform API when configured. The API
    // returns [] for anonymous callers and artmakers without tagged events,
    // same as the source.
    const { artsApiConfigured, artsApiFetch } = await loadArtsApi();
    if (artsApiConfigured()) {
      try {
        const response = await artsApiFetch("/arts/events/tagged");
        if (!response.ok) {
          return [];
        }
        // TaggedEventListItem has no Date fields — no revival needed.
        return (await response.json()) as TaggedEventListItem[];
      } catch {
        return [];
      }
    }

    try {
      const { isAuthenticated, userId } = await auth();

      if (!isAuthenticated || !userId) {
        return [];
      }

      const [artmaker] = await db
        .select({ id: artmakers.id })
        .from(artmakers)
        .where(eq(artmakers.clerkUserId, userId))
        .limit(1);

      if (!artmaker) {
        return [];
      }

      const rows = await db
        .select({
          date: events.date,
          description: events.description,
          id: events.id,
          image: events.image,
          location: events.location,
          price: events.price,
          slug: events.slug,
          time: events.time,
          title: events.title,
          ticketLink: events.ticketLink,
          venue: events.venue,
        })
        .from(eventArtmakers)
        .innerJoin(events, eq(eventArtmakers.eventId, events.id))
        .where(and(eq(eventArtmakers.artmakerId, artmaker.id), eq(events.status, "published")))
        .orderBy(asc(events.date));

      const today = new Date().toISOString().slice(0, 10);
      const seen = new Set<number>();
      const tagged: TaggedEventListItem[] = [];

      for (const row of rows) {
        if (seen.has(row.id)) {
          continue;
        }
        seen.add(row.id);
        tagged.push({
          ...row,
          image: normalizeStoredImageUrl(row.image),
          upcoming: row.date >= today,
        });
      }

      return tagged;
    } catch {
      return [];
    }
  },
);

export interface TaggedEventListItem {
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
  upcoming: boolean;
}
