import { z } from "zod";

const optionalUrlField = z
  .union([z.string().url("Must be a valid URL"), z.literal("")])
  .optional()
  .transform((val) => (val === "" ? undefined : val));

function normalizeInstagramInput(input: unknown): string {
  const raw = String(input ?? "").trim();
  if (!raw) return "";

  // Accept @handle
  const withoutAt = raw.startsWith("@") ? raw.slice(1).trim() : raw;
  if (!withoutAt) return "";

  // Accept handle-only (no spaces, no slashes)
  if (
    !withoutAt.includes("/") &&
    !withoutAt.includes(".") &&
    !withoutAt.includes("://")
  ) {
    return `https://instagram.com/${withoutAt}`;
  }

  // Accept instagram.com/... without protocol
  if (withoutAt.startsWith("instagram.com/")) {
    return `https://${withoutAt}`;
  }

  return withoutAt;
}

function normalizeE164Phone(input: unknown): string | undefined {
  const raw = String(input ?? "").trim();
  if (!raw) return undefined;

  // Keep leading + if present; otherwise strip to digits.
  if (raw.startsWith("+")) {
    const candidate = `+${raw.slice(1).replace(/[^0-9]/g, "")}`;
    return candidate === "+" ? undefined : candidate;
  }

  const digits = raw.replace(/[^0-9]/g, "");
  if (!digits) return undefined;

  // US convenience: 10 digits -> +1XXXXXXXXXX, 11 digits starting with 1 -> +1...
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return `+${digits}`;
}

const phoneNumberField = z
  .union([z.string(), z.literal("")])
  .optional()
  .transform((val) => normalizeE164Phone(val))
  .refine((val) => val === undefined || /^\+[1-9]\d{1,14}$/.test(val), {
    message: "Phone number must be in E.164 format (e.g. +15551234567)",
  });

// Common optional fields shared by both artists and fans
const optionalFields = {
  spotifyUrl: optionalUrlField,
  spotifyArtistId: z.string().optional().or(z.literal("")),
  instagram: optionalUrlField,
  twitter: optionalUrlField,
  tiktok: optionalUrlField,
  website: optionalUrlField,
  image: optionalUrlField,
  phoneNumber: phoneNumberField,
};

const requiredSpotifyUrl = z
  .string()
  .min(1, "Spotify is required")
  .url("Must be a valid URL");

const requiredSpotifyArtistId = z
  .string()
  .min(1, "Spotify artist selection is required")
  .max(255, "Spotify artist ID is too long");

const requiredInstagram = z
  .union([z.string(), z.literal("")])
  .transform((val) => normalizeInstagramInput(val))
  .refine((val) => val.length > 0, { message: "Instagram is required" })
  .pipe(z.string().url("Must be a valid URL"));

// Artist onboarding schema - requires location, genre, and bio
export const artistOnboardingSchema = z.object({
  name: z
    .string()
    .min(1, "Artist name is required")
    .max(100, "Artist name must be less than 100 characters"),
  location: z
    .string()
    .min(1, "Location is required")
    .max(100, "Location must be less than 100 characters"),
  genre: z.enum(
    ["COUNTRY", "EDM", "HARDCORE & ROCK", "HIP-HOP & R&B", "OTHER"],
    {
      message: "Please select a valid genre",
    },
  ),
  bio: z
    .string()
    .min(10, "Bio must be at least 10 characters")
    .max(500, "Bio must be less than 500 characters"),
  spotifyUrl: requiredSpotifyUrl,
  spotifyArtistId: requiredSpotifyArtistId,
  instagram: requiredInstagram,
  twitter: optionalFields.twitter,
  tiktok: optionalFields.tiktok,
  website: optionalFields.website,
  image: optionalFields.image,
  phoneNumber: optionalFields.phoneNumber,
});

// Fan onboarding schema - only requires name
export const fanOnboardingSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters")
    .transform((val) => val.trim())
    .refine((val) => val.length > 0, "Name cannot be only whitespace"),
  location: z.string().optional(),
  genre: z
    .enum(["COUNTRY", "EDM", "HARDCORE & ROCK", "HIP-HOP & R&B", "OTHER"])
    .optional(),
  bio: z.string().optional(),
  ...optionalFields,
});

// Legacy schema for backward compatibility (defaults to artist schema)
export const onboardingSchema = artistOnboardingSchema;

export type OnboardingFormData = z.infer<typeof onboardingSchema>;
export type ArtistOnboardingFormData = z.infer<typeof artistOnboardingSchema>;
export type FanOnboardingFormData = z.infer<typeof fanOnboardingSchema>;
