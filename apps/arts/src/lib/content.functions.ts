import { readResponse } from "@dpmedia/api-client";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getArtsApi, withArticleDates, withCreatedAt } from "./api.server";

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

export const listArtsEvents = createServerFn({ method: "GET" }).handler(async () => {
  return (await readResponse(await getArtsApi().events.$get())).map((row) => withCreatedAt(row));
});

export const listArtsAdminEvents = createServerFn({ method: "GET" }).handler(async () => {
  return (await readResponse(await getArtsApi().admin.events.$get())).map((row) =>
    withCreatedAt(row),
  );
});

export const listArtsArticles = createServerFn({ method: "GET" }).handler(async () => {
  return (await readResponse(await getArtsApi().articles.$get())).map((row) =>
    withArticleDates(row),
  );
});

export const listArtsAdminArticles = createServerFn({ method: "GET" }).handler(async () => {
  return (await readResponse(await getArtsApi().admin.articles.$get())).map((row) =>
    withArticleDates(row),
  );
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
    return readResponse(await getArtsApi().admin.articles.$post({ json: data }));
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
    return readResponse(
      await getArtsApi().admin.articles[":id"].$patch({
        param: { id: String(data.id) },
        json: data,
      }),
    );
  });

export const toggleArtsArticleStatus = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.number() }))
  .handler(async ({ data }) => {
    return readResponse(
      await getArtsApi().admin.articles[":id"].toggle.$post({ param: { id: String(data.id) } }),
    );
  });

export const deleteArtsArticle = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.number() }))
  .handler(async ({ data }) => {
    return readResponse(
      await getArtsApi().admin.articles[":id"].$delete({ param: { id: String(data.id) } }),
    );
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
    return readResponse(await getArtsApi().admin.events.$post({ json: data }));
  });

export const toggleArtsEventStatus = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.number() }))
  .handler(async ({ data }) => {
    return readResponse(
      await getArtsApi().admin.events[":id"].toggle.$post({ param: { id: String(data.id) } }),
    );
  });

export const deleteArtsEvent = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.number() }))
  .handler(async ({ data }) => {
    return readResponse(
      await getArtsApi().admin.events[":id"].$delete({ param: { id: String(data.id) } }),
    );
  });

export const listTaggedEventsForCurrentArtmaker = createServerFn({ method: "GET" }).handler(
  async () => {
    return await readResponse(await getArtsApi().events.tagged.$get());
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
