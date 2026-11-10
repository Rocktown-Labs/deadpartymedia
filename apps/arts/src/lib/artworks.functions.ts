import { readResponse } from "@dpmedia/api-client";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getArtsApi, listAllArtworks, withCreatedAt } from "./api.server";

export interface ArtworkListItem {
  id: number;
  artmakerId: number;
  artmakerName: string;
  artmakerSlug: string;
  city: string;
  state: string;
  slug: string;
  title: string;
  image: string;
  description: string | null;
  medium: string | null;
  year: string | null;
  status: "draft" | "published" | "archived";
  forSale: boolean;
  priceCents: number | null;
  createdAt: Date;
}

export interface PaginatedArtworksResult {
  items: ArtworkListItem[];
  nextOffset: number | null;
  totalCount: number;
  /** Published artwork count per medium group slug. Sums to totalCount. */
  groupCounts: Record<string, number>;
}

const artworkInputSchema = z
  .object({
    description: z.string().max(700, "Description must stay under 700 characters").optional(),
    forSale: z.boolean(),
    image: z.string().optional(),
    imageKey: z.string().min(1, "Upload an image or provide an image URL").optional(),
    medium: z.string().max(80, "Medium must stay under 80 characters").optional(),
    price: z.string().optional(),
    status: z.enum(["draft", "published"]).default("published"),
    title: z
      .string()
      .trim()
      .min(1, "Title is required")
      .max(120, "Title must stay under 120 characters"),
    year: z.string().max(20, "Year must stay under 20 characters").optional(),
  })
  .refine((value) => Boolean(value.imageKey || value.image), {
    message: "Upload an image or provide an image URL",
    path: ["imageKey"],
  });

export const listPublishedArtworks = createServerFn({ method: "GET" }).handler(async () => {
  return listAllArtworks();
});

export const listPublishedArtworksPaginated = createServerFn({ method: "GET" })
  .validator(
    z.object({
      artmaker: z.string().optional(),
      limit: z.number().int().min(1).max(100).default(24),
      medium: z.string().optional(),
      offset: z.number().int().min(0).default(0),
      sort: z.enum(["recent", "available", "title"]).default("recent"),
    }),
  )
  .handler(async ({ data }) => {
    const page = await readResponse(
      await getArtsApi().artworks.$get({
        query: { ...data, limit: String(data.limit), offset: String(data.offset) },
      }),
    );
    return { ...page, items: page.items.map((row) => withCreatedAt(row)) };
  });

export const getArtworkByIdOrSlug = createServerFn({ method: "GET" })
  .validator(z.object({ identifier: z.string().min(1) }))
  .handler(async ({ data }) => {
    const row = await readResponse(
      await getArtsApi().artworks[":id"].$get({ param: { id: data.identifier } }),
    );
    return row ? withCreatedAt(row) : null;
  });

export const listMediumGroupArtworks = createServerFn({ method: "GET" })
  .validator(z.object({ slug: z.string().min(1) }))
  .handler(async ({ data }) => {
    return listAllArtworks(data.slug);
  });

export const listPublishedArtworksByArtmakerSlug = createServerFn({ method: "GET" })
  .validator(z.object({ slug: z.string().min(1) }))
  .handler(async ({ data }) => {
    return (
      await readResponse(
        await getArtsApi().artworks["by-artmaker"][":slug"].$get({ param: { slug: data.slug } }),
      )
    ).map((row) => withCreatedAt(row));
  });

export const listCurrentArtworks = createServerFn({ method: "GET" }).handler(async () => {
  return (await readResponse(await getArtsApi().dashboard.artworks.$get())).map((row) =>
    withCreatedAt(row),
  );
});

export const saveArtwork = createServerFn({ method: "POST" })
  .validator(artworkInputSchema)
  .handler(async ({ data }) => {
    return readResponse(await getArtsApi().dashboard.artworks.$post({ json: data }));
  });

export const deleteCurrentArtwork = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.number() }))
  .handler(async ({ data }) => {
    return readResponse(
      await getArtsApi().dashboard.artworks[":id"].$delete({ param: { id: String(data.id) } }),
    );
  });

export const updateCurrentArtwork = createServerFn({ method: "POST" })
  .validator(
    z.object({
      description: z.string().max(700, "Description must stay under 700 characters").optional(),
      forSale: z.boolean(),
      id: z.number(),
      medium: z.string().max(80, "Medium must stay under 80 characters").optional(),
      price: z.string().optional(),
      status: z.enum(["draft", "published"]),
      title: z
        .string()
        .trim()
        .min(1, "Title is required")
        .max(120, "Title must stay under 120 characters"),
      year: z.string().max(20, "Year must stay under 20 characters").optional(),
    }),
  )
  .handler(async ({ data }) => {
    const result = await readResponse(
      await getArtsApi().dashboard.artworks[":id"].$patch({
        param: { id: String(data.id) },
        json: data,
      }),
    );
    return { ...result, artwork: withCreatedAt(result.artwork) };
  });

export const listAdminArtworks = createServerFn({ method: "GET" }).handler(async () => {
  return (await readResponse(await getArtsApi().admin.artworks.$get())).map((row) =>
    withCreatedAt(row),
  );
});

export const createArtsArtwork = createServerFn({ method: "POST" })
  .validator(
    z.object({
      artmakerId: z.number(),
      description: z.string().optional(),
      forSale: z.boolean().default(false),
      image: z.string().min(1, "Image is required"),
      medium: z.string().optional(),
      priceCents: z.number().optional(),
      status: z.enum(["draft", "published", "archived"]).default("published"),
      title: z.string().min(1, "Title is required"),
      year: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    return readResponse(await getArtsApi().admin.artworks.$post({ json: data }));
  });

export const updateArtsArtwork = createServerFn({ method: "POST" })
  .validator(
    z.object({
      description: z.string().optional(),
      forSale: z.boolean().optional(),
      id: z.number(),
      image: z.string().min(1, "Image is required"),
      medium: z.string().optional(),
      priceCents: z.number().optional(),
      status: z.enum(["draft", "published", "archived"]),
      title: z.string().min(1, "Title is required"),
      year: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    return readResponse(
      await getArtsApi().admin.artworks[":id"].$patch({
        param: { id: String(data.id) },
        json: data,
      }),
    );
  });

export const toggleArtsArtworkStatus = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.number() }))
  .handler(async ({ data }) => {
    return readResponse(
      await getArtsApi().admin.artworks[":id"].status.$post({ param: { id: String(data.id) } }),
    );
  });

export const deleteArtsArtwork = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.number() }))
  .handler(async ({ data }) => {
    return readResponse(
      await getArtsApi().admin.artworks[":id"].$delete({ param: { id: String(data.id) } }),
    );
  });
