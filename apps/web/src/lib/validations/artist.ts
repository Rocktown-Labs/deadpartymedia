import { z } from "zod";

function normalizeE164Phone(input: unknown): string | undefined {
  const raw = String(input ?? "").trim();
  if (!raw) return undefined;

  if (raw.startsWith("+")) {
    const candidate = `+${raw.slice(1).replace(/[^0-9]/g, "")}`;
    return candidate === "+" ? undefined : candidate;
  }

  const digits = raw.replace(/[^0-9]/g, "");
  if (!digits) return undefined;

  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return `+${digits}`;
}

const urlSchema = z
  .union([z.string().url("Must be a valid URL"), z.literal("")])
  .optional()
  .transform((val) => (val === "" ? undefined : val));

const phoneNumberSchema = z
  .union([z.string(), z.literal("")])
  .optional()
  .transform((val) => normalizeE164Phone(val))
  .refine((val) => val === undefined || /^\+[1-9]\d{1,14}$/.test(val), {
    message: "Phone number must be in E.164 format (e.g. +15551234567)",
  });

export const artistSchema = z.object({
  name: z
    .string()
    .min(1, "Artist name is required")
    .max(255, "Name is too long"),
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(255, "Slug is too long")
    .optional(),
  bio: z.string().min(1, "Bio is required").max(2000, "Bio is too long"),
  location: z
    .string()
    .min(1, "Location is required")
    .max(255, "Location is too long"),
  genre: z.enum(
    ["COUNTRY", "EDM", "HARDCORE & ROCK", "HIP-HOP & R&B", "OTHER"],
    {
      message: "Please select a valid genre",
    },
  ),
  spotifyUrl: urlSchema,
  spotifyArtistId: z.string().max(255).optional().or(z.literal("")),
  instagram: urlSchema,
  twitter: urlSchema,
  tiktok: urlSchema,
  website: urlSchema,
  image: urlSchema,
  email: z
    .string()
    .email("Must be a valid email address")
    .optional()
    .or(z.literal("")),
  phoneNumber: phoneNumberSchema,
});

export type ArtistFormData = z.infer<typeof artistSchema>;

// Legacy schema for backwards compatibility
export const artistUpdateSchema = artistSchema;
export type ArtistUpdateInput = ArtistFormData;
