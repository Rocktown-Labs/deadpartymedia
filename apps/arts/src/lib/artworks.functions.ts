import { auth } from "@clerk/tanstack-react-start/server";
import { db } from "@dpmedia/db";
import { artmakers, artworks } from "@dpmedia/db/schema";
import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { z } from "zod";
import { requireArtsStaff } from "#/lib/artmakers.functions.ts";
import { getMediumGroup } from "#/lib/mediums.ts";
import { createSlug } from "#/lib/slug.ts";
import { getPublicUploadUrl } from "#/lib/upload.ts";

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
      .min(1, "Title is required")
      .max(120, "Title must stay under 120 characters")
      .transform((value) => value.trim()),
    year: z.string().max(20, "Year must stay under 20 characters").optional(),
  })
  .refine((value) => Boolean(value.imageKey || value.image), {
    message: "Upload an image or provide an image URL",
    path: ["imageKey"],
  });

async function getCurrentArtmakerId() {
  const { isAuthenticated, userId } = await auth();

  if (!isAuthenticated || !userId) {
    throw redirect({ to: "/" });
  }

  const [artmaker] = await db
    .select({ id: artmakers.id })
    .from(artmakers)
    .where(eq(artmakers.clerkUserId, userId))
    .limit(1);

  if (!artmaker) {
    throw redirect({ to: "/onboarding" });
  }

  return artmaker.id;
}

async function makeUniqueArtworkSlug(title: string) {
  const baseSlug = createSlug(title);
  let candidate = baseSlug;
  let suffix = 2;

  while (true) {
    const existing = await db
      .select({ id: artworks.id })
      .from(artworks)
      .where(eq(artworks.slug, candidate))
      .limit(1);

    if (existing.length === 0) {
      return candidate;
    }

    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
}

function parsePriceCents(price?: string) {
  const trimmed = price?.trim();
  if (!trimmed) {
    return null;
  }

  const amount = Number(trimmed.replaceAll(/[^0-9.]/g, ""));
  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  return Math.round(amount * 100);
}

function artworkSelect() {
  return {
    artmakerId: artworks.artmakerId,
    artmakerName: artmakers.name,
    artmakerSlug: artmakers.slug,
    city: artmakers.city,
    createdAt: artworks.createdAt,
    description: artworks.description,
    forSale: artworks.forSale,
    id: artworks.id,
    image: artworks.image,
    medium: artworks.medium,
    priceCents: artworks.priceCents,
    slug: artworks.slug,
    state: artmakers.state,
    status: artworks.status,
    title: artworks.title,
    year: artworks.year,
  };
}

export const listPublishedArtworks = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const rows = await db
      .select(artworkSelect())
      .from(artworks)
      .innerJoin(artmakers, eq(artworks.artmakerId, artmakers.id))
      .where(and(eq(artworks.status, "published"), eq(artmakers.status, "published")))
      .orderBy(desc(artworks.createdAt));

    return rows satisfies ArtworkListItem[];
  } catch {
    return [] satisfies ArtworkListItem[];
  }
});

export const listMediumGroupArtworks = createServerFn({ method: "GET" })
  .validator(z.object({ slug: z.string().min(1) }))
  .handler(async ({ data }) => {
    const group = getMediumGroup(data.slug);

    if (!group) {
      return [] satisfies ArtworkListItem[];
    }

    try {
      const mediumMatches = group.mediums.map((medium) =>
        ilike(sql<string>`coalesce(${artworks.medium}, '')`, `%${medium}%`),
      );

      const rows = await db
        .select(artworkSelect())
        .from(artworks)
        .innerJoin(artmakers, eq(artworks.artmakerId, artmakers.id))
        .where(
          and(
            eq(artworks.status, "published"),
            eq(artmakers.status, "published"),
            mediumMatches.length > 0 ? or(...mediumMatches) : undefined,
          ),
        )
        .orderBy(desc(artworks.createdAt));

      return rows satisfies ArtworkListItem[];
    } catch {
      return [] satisfies ArtworkListItem[];
    }
  });

export const listPublishedArtworksByArtmakerSlug = createServerFn({ method: "GET" })
  .validator(z.object({ slug: z.string().min(1) }))
  .handler(async ({ data }) => {
    try {
      const rows = await db
        .select(artworkSelect())
        .from(artworks)
        .innerJoin(artmakers, eq(artworks.artmakerId, artmakers.id))
        .where(
          and(
            eq(artmakers.slug, data.slug),
            eq(artworks.status, "published"),
            eq(artmakers.status, "published"),
          ),
        )
        .orderBy(desc(artworks.createdAt));

      return rows satisfies ArtworkListItem[];
    } catch {
      return [] satisfies ArtworkListItem[];
    }
  });

export const listCurrentArtworks = createServerFn({ method: "GET" }).handler(async () => {
  const artmakerId = await getCurrentArtmakerId();

  const rows = await db
    .select(artworkSelect())
    .from(artworks)
    .innerJoin(artmakers, eq(artworks.artmakerId, artmakers.id))
    .where(eq(artworks.artmakerId, artmakerId))
    .orderBy(desc(artworks.createdAt));

  return rows satisfies ArtworkListItem[];
});

export const saveArtwork = createServerFn({ method: "POST" })
  .validator(artworkInputSchema)
  .handler(async ({ data }) => {
    const artmakerId = await getCurrentArtmakerId();
    const slug = await makeUniqueArtworkSlug(data.title);
    const [created] = await db
      .insert(artworks)
      .values({
        artmakerId,
        description: data.description?.trim() || null,
        forSale: data.forSale,
        image: data.imageKey ? getPublicUploadUrl(data.imageKey) : (data.image ?? ""),
        medium: data.medium?.trim() || null,
        priceCents: data.forSale ? parsePriceCents(data.price) : null,
        slug,
        status: data.status,
        title: data.title,
        year: data.year?.trim() || null,
      })
      .returning();

    return { artwork: created, success: true };
  });

export const listAdminArtworks = createServerFn({ method: "GET" }).handler(async () => {
  await requireArtsStaff();

  const rows = await db
    .select(artworkSelect())
    .from(artworks)
    .innerJoin(artmakers, eq(artworks.artmakerId, artmakers.id))
    .orderBy(desc(artworks.createdAt));

  return rows satisfies ArtworkListItem[];
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
    await requireArtsStaff();

    const slug = await makeUniqueArtworkSlug(data.title);
    const [created] = await db
      .insert(artworks)
      .values({
        artmakerId: data.artmakerId,
        description: data.description || null,
        forSale: data.forSale,
        image: data.image,
        medium: data.medium || null,
        priceCents: data.priceCents || null,
        slug,
        status: data.status,
        title: data.title,
        year: data.year || null,
      })
      .returning();

    return { artwork: created, success: true };
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
    await requireArtsStaff();

    const [updated] = await db
      .update(artworks)
      .set({
        description: data.description || null,
        forSale: data.forSale ?? false,
        image: data.image,
        medium: data.medium || null,
        priceCents: data.priceCents || null,
        status: data.status,
        title: data.title,
        updatedAt: new Date(),
        year: data.year || null,
      })
      .where(eq(artworks.id, data.id))
      .returning();

    return { artwork: updated, success: true };
  });

export const toggleArtsArtworkStatus = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.number() }))
  .handler(async ({ data }) => {
    await requireArtsStaff();

    const [existing] = await db.select().from(artworks).where(eq(artworks.id, data.id));
    if (!existing) {
      throw new Error("Artwork not found");
    }

    const nextStatus = existing.status === "published" ? "draft" : "published";

    const [updated] = await db
      .update(artworks)
      .set({
        status: nextStatus,
        updatedAt: new Date(),
      })
      .where(eq(artworks.id, data.id))
      .returning();

    return { artwork: updated, success: true };
  });

export const deleteArtsArtwork = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.number() }))
  .handler(async ({ data }) => {
    await requireArtsStaff();

    await db.delete(artworks).where(eq(artworks.id, data.id));
    return { success: true };
  });
