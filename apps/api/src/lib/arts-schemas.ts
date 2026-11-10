import { z } from "zod";

/**
 * Arts request schemas and response shapes, ported verbatim from
 * apps/arts/src/lib/{artmakers,artmakers.functions,artworks.functions}.ts
 * so API validation matches the TanStack server-function validators
 * exactly. Response interfaces document the JSON each endpoint returns.
 */

const MAX_INSTAGRAM_USERNAME_LENGTH = 30;

function normalizeStringInput(input: unknown) {
  return typeof input === "string" ? input.trim() : "";
}

export function normalizeInstagramUsername(input: unknown) {
  const raw = normalizeStringInput(input);

  if (!raw) {
    return "";
  }

  let candidate = raw.startsWith("@") ? raw.slice(1).trim() : raw;
  candidate = candidate.replace(/^(?:https?:\/\/)?(?:www\.|m\.)?instagram\.com\//i, "");
  candidate = candidate.replace(/^\/+/, "");

  const [firstSegment = ""] = candidate.split(/[/?#]/);
  candidate = firstSegment.trim();

  if (!new RegExp(`^[A-Za-z0-9._]{1,${MAX_INSTAGRAM_USERNAME_LENGTH}}$`).test(candidate)) {
    return "";
  }

  return candidate;
}

function normalizePhoneNumber(input: unknown) {
  const raw = normalizeStringInput(input);

  if (!raw) {
    return "";
  }

  if (raw.startsWith("+")) {
    const candidate = `+${raw.slice(1).replaceAll(/[^0-9]/g, "")}`;
    return candidate === "+" ? "" : candidate;
  }

  const digits = raw.replaceAll(/[^0-9]/g, "");

  if (digits.length === 10) {
    return `+1${digits}`;
  }

  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }

  return digits ? `+${digits}` : "";
}

export const artmakerOnboardingSchema = z.object({
  bio: z.string().max(500, "Bio must stay under 500 characters").optional().or(z.literal("")),
  city: z
    .string()
    .min(1, "City is required")
    .max(80, "City must stay under 80 characters")
    .transform((value) => value.trim()),
  customMedium: z
    .string()
    .max(80, "Custom medium must stay under 80 characters")
    .optional()
    .or(z.literal("")),
  instagramUsername: z
    .string()
    .transform((value) => normalizeInstagramUsername(value))
    .refine((value) => value.length > 0, {
      message: "Instagram username is required",
    }),
  image: z.string().optional().or(z.literal("")),
  imageKey: z.string().optional().or(z.literal("")),
  medium: z.array(z.string().min(1).max(80)).min(1, "Select at least one medium"),
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must stay under 100 characters")
    .transform((value) => value.trim()),
  phoneNumber: z
    .string()
    .transform((value) => normalizePhoneNumber(value))
    .refine((value) => /^\+[1-9]\d{1,14}$/.test(value), {
      message: "Use a valid phone number",
    }),
  pronouns: z
    .string()
    .max(40, "Pronouns must stay under 40 characters")
    .optional()
    .or(z.literal("")),
  showPronouns: z.boolean(),
  state: z
    .string()
    .min(2, "State is required")
    .max(2, "Use a two-letter state code")
    .transform((value) => value.trim().toUpperCase()),
});

export type ArtmakerOnboardingInput = z.infer<typeof artmakerOnboardingSchema>;

// NOTE: this is the arts fan onboarding schema (name only) — deliberately
// different from packages/contracts' music-site fanOnboardingSchema.
export const fanOnboardingSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must stay under 100 characters")
    .transform((value) => value.trim()),
});

export type FanOnboardingInput = z.infer<typeof fanOnboardingSchema>;

// createArtsArtmakerStub validator (admin stub creation).
export const artmakerStubSchema = z.object({
  name: z.string().min(1, "Name is required"),
  city: z.string().optional(),
  image: z.string().optional(),
  instagramUsername: z.string().optional(),
  medium: z.array(z.string()).optional(),
  state: z.string().optional(),
});

// updateArtsArtmaker validator. `id` arrives via the URL segment and is
// merged into the parsed object before validation.
export const artmakerAdminUpdateSchema = z.object({
  bio: z.string().optional(),
  city: z.string().min(1, "City is required"),
  hidden: z.boolean().optional(),
  id: z.number(),
  image: z.string().optional(),
  instagramUsername: z.string().optional(),
  medium: z.array(z.string()).optional(),
  name: z.string().min(1, "Name is required"),
  state: z.string().default("AR"),
  status: z.enum(["draft", "published", "hidden"]).optional(),
});

export const artworkIdSchema = z.object({ id: z.number() });

export const slugParamSchema = z.object({ slug: z.string().min(1) });

// getArtworkByIdOrSlug validator — the :id segment may be numeric or a slug.
export const identifierParamSchema = z.object({ identifier: z.string().min(1) });

// saveArtwork (dashboard) validator.
export const artworkInputSchema = z
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

// updateCurrentArtwork (dashboard) validator. `id` arrives via the URL
// segment and is merged into the parsed object before validation.
export const artworkDashboardUpdateSchema = z.object({
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
});

// createArtsArtwork (admin) validator.
export const adminArtworkCreateSchema = z.object({
  artmakerId: z.number(),
  description: z.string().optional(),
  forSale: z.boolean().default(false),
  image: z.string().min(1, "Image is required"),
  medium: z.string().optional(),
  priceCents: z.number().optional(),
  status: z.enum(["draft", "published", "archived"]).default("published"),
  title: z.string().min(1, "Title is required"),
  year: z.string().optional(),
});

// updateArtsArtwork (admin) validator. `id` arrives via the URL segment and
// is merged into the parsed object before validation.
export const adminArtworkUpdateSchema = z.object({
  description: z.string().optional(),
  forSale: z.boolean().optional(),
  id: z.number(),
  image: z.string().min(1, "Image is required"),
  medium: z.string().optional(),
  priceCents: z.number().optional(),
  status: z.enum(["draft", "published", "archived"]),
  title: z.string().min(1, "Title is required"),
  year: z.string().optional(),
});

// listPublishedArtworksPaginated validator. limit/offset use coercion
// because query params arrive as strings (the server fn received numbers).
export const artworkListQuerySchema = z.object({
  artmaker: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(24),
  medium: z.string().optional(),
  offset: z.coerce.number().int().min(0).default(0),
  sort: z.enum(["recent", "available", "title"]).default("recent"),
});

export type ArtworkListQuery = z.infer<typeof artworkListQuerySchema>;

// --- Response shapes (must stay identical to the server fn returns) ---

export interface ArtmakerListItem {
  id: number;
  slug: string;
  name: string;
  city: string;
  state: string;
  pronouns: string | null;
  showPronouns: boolean;
  medium: string[];
  instagramUsername: string;
  instagramUrl: string;
  bio: string | null;
  image: string | null;
  artworkCount: number;
}

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

// --- Content (articles/events), venues, commerce, and admin schemas ---
// Ported verbatim from apps/arts/src/lib/{content,venues,fourthwall,admin}.functions.ts
// validators. Key order is preserved so the "first issue message" reported
// on 400s matches what the TanStack validators surfaced.

// createArtsArticle validator.
export const articleCreateSchema = z.object({
  content: z.string().min(1, "Content is required"),
  artmakerIds: z.array(z.number()).optional(),
  coverImage: z.string().optional(),
  excerpt: z.string().min(1, "Excerpt is required"),
  status: z.enum(["draft", "published", "archived"]).default("published"),
  title: z.string().min(1, "Title is required"),
});

// updateArtsArticle validator. `id` arrives via the /admin/articles/:id URL
// segment and is merged into the parsed object before validation.
export const articleUpdateSchema = z.object({
  content: z.string().min(1, "Content is required"),
  artmakerIds: z.array(z.number()).optional(),
  coverImage: z.string().optional(),
  excerpt: z.string().min(1, "Excerpt is required"),
  id: z.number(),
  status: z.enum(["draft", "published", "archived"]),
  title: z.string().min(1, "Title is required"),
});

// createArtsEvent validator.
export const eventCreateSchema = z.object({
  artmakerIds: z.array(z.number()).optional(),
  date: z.string().min(1, "Date is required"),
  description: z.string().min(1, "Description is required"),
  genre: z.enum(["COUNTRY", "EDM", "HARDCORE & ROCK", "HIP-HOP & R&B", "OTHER"]).default("OTHER"),
  image: z.string().optional(),
  location: z.string().min(1, "Location is required"),
  price: z.string().optional(),
  status: z.enum(["draft", "published", "past"]).default("published"),
  ticketLink: z.string().optional(),
  time: z.string().optional(),
  title: z.string().min(1, "Title is required"),
  venue: z.string().min(1, "Venue is required"),
});

// createArtsVenue validator.
export const venueCreateSchema = z.object({
  address: z.string().optional(),
  city: z.string().default("Little Rock"),
  name: z.string().min(1, "Venue name is required"),
  phone: z.string().optional(),
  state: z.string().default("AR"),
  website: z.string().optional(),
  zip: z.string().optional(),
});

// updateArtsVenue validator. `id` arrives via the /admin/venues/:id URL
// segment and is merged into the parsed object before validation.
export const venueUpdateSchema = z.object({
  address: z.string().optional(),
  city: z.string().min(1, "City is required"),
  id: z.number(),
  name: z.string().min(1, "Name is required"),
  phone: z.string().optional(),
  state: z.string().default("AR"),
  website: z.string().optional(),
  zip: z.string().optional(),
});

// getArtsCart validator. cartId is optional; the REST route accepts it as
// ?cartId= or a JSON body ({ cartId }).
export const cartInputSchema = z.object({
  cartId: z.string().optional(),
});

// addArtsCartItem / updateArtsCartItem validator.
export const cartLineSchema = z.object({
  cartId: z.string().optional(),
  merchandiseId: z.string().min(1),
  quantity: z.number().int().min(0).max(99).default(1),
});

// updateArtsUserRole validator. `userId` arrives via the /admin/users/:id
// URL segment and is merged into the parsed object before validation.
export const artsUserRoleSchema = z.object({
  role: z.enum(["artmaker", "arts_admin", "arts_writer", "fan", "super_admin"]),
  userId: z.number(),
});

// inviteArtsUser validator.
export const artsInvitationSchema = z.object({
  email: z.string().email("Valid email is required"),
  role: z.enum(["arts_admin", "arts_writer", "artmaker", "fan"]),
});
