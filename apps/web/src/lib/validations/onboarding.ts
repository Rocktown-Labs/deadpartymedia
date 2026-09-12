import { z } from "zod";

const MAX_INSTAGRAM_USERNAME_LENGTH = 30;

const optionalUrlField = z
  .union([z.string().url("Must be a valid URL"), z.literal("")])
  .optional()
  .transform((val) => (val === "" ? undefined : val));

function normalizeInstagramInput(input: unknown): string {
  const raw = String(input ?? "").trim();
  if (!raw) {
    return "";
  }

  // Username-first: accept @handle, handle-only, or a full instagram.com URL and normalize
  // to a canonical URL: https://instagram.com/<username>
  let candidate = raw.startsWith("@") ? raw.slice(1).trim() : raw;
  if (!candidate) {
    return "";
  }

  // Strip instagram domain/protocol if present
  candidate = candidate.replace(/^(?:https?:\/\/)?(?:www\.|m\.)?instagram\.com\//i, "");

  // Remove leading slashes and drop path/query/hash, keeping only the first segment
  candidate = candidate.replace(/^\/+/, "");

  const [firstSegment = ""] = candidate.split(/[/?#]/);
  candidate = firstSegment.trim();
  if (!candidate) {
    return "";
  }

  // Be permissive but safe: instagram usernames are typically 1-30 of letters/numbers/._
  if (!new RegExp(`^[A-Za-z0-9._]{1,${MAX_INSTAGRAM_USERNAME_LENGTH}}$`).test(candidate)) {
    // Return an empty string on invalid format so callers (e.g. Zod schemas) can
    // handle the error via refinement instead of relying on thrown exceptions.
    return "";
  }

  return `https://instagram.com/${candidate}`;
}

function normalizeE164Phone(input: unknown): string | undefined {
  const raw = String(input ?? "").trim();
  if (!raw) {
    return undefined;
  }

  // Keep leading + if present; otherwise strip to digits.
  if (raw.startsWith("+")) {
    const candidate = `+${raw.slice(1).replaceAll(/[^0-9]/g, "")}`;
    return candidate === "+" ? undefined : candidate;
  }

  const digits = raw.replaceAll(/[^0-9]/g, "");
  if (!digits) {
    return undefined;
  }

  // US convenience: 10 digits -> +1XXXXXXXXXX, 11 digits starting with 1 -> +1...
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }
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
  image: optionalUrlField,
  instagram: optionalUrlField,
  phoneNumber: phoneNumberField,
  spotifyArtistId: z.string().optional().or(z.literal("")),
  spotifyUrl: optionalUrlField,
  tiktok: optionalUrlField,
  twitter: optionalUrlField,
  website: optionalUrlField,
};

const requiredSpotifyUrl = z.string().min(1, "Spotify is required").url("Must be a valid URL");

const requiredSpotifyArtistId = z
  .string()
  .min(1, "Spotify artist selection is required")
  .max(255, "Spotify artist ID is too long");

const requiredInstagram = z
  .union([z.string(), z.literal("")])
  .transform((val) => normalizeInstagramInput(val))
  .refine((val) => val.length > 0, { message: "Instagram is required" })
  .pipe(z.string().url("Must be a valid URL"))
  .refine(
    (val) => {
      try {
        const url = new URL(val);
        return url.hostname === "instagram.com" || url.hostname === "www.instagram.com";
      } catch {
        return false;
      }
    },
    {
      message: "Must be a valid Instagram profile",
    },
  );

// Artist onboarding schema - requires location, genre, and bio
export const artistOnboardingSchema = z.object({
  bio: z
    .string()
    .min(10, "Bio must be at least 10 characters")
    .max(500, "Bio must be less than 500 characters"),
  genre: z.enum(["COUNTRY", "EDM", "HARDCORE & ROCK", "HIP-HOP & R&B", "OTHER"], {
    message: "Please select a valid genre",
  }),
  image: optionalFields.image,
  instagram: requiredInstagram,
  location: z
    .string()
    .min(1, "Location is required")
    .max(100, "Location must be less than 100 characters"),
  name: z
    .string()
    .min(1, "Artist name is required")
    .max(100, "Artist name must be less than 100 characters"),
  phoneNumber: optionalFields.phoneNumber,
  spotifyArtistId: requiredSpotifyArtistId,
  spotifyUrl: requiredSpotifyUrl,
  tiktok: optionalFields.tiktok,
  twitter: optionalFields.twitter,
  website: optionalFields.website,
});

// Fan onboarding schema - only requires name
export const fanOnboardingSchema = z.object({
  bio: z.string().optional(),
  genre: z.enum(["COUNTRY", "EDM", "HARDCORE & ROCK", "HIP-HOP & R&B", "OTHER"]).optional(),
  location: z.string().optional(),
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters")
    .transform((val) => val.trim())
    .refine((val) => val.length > 0, "Name cannot be only whitespace"),
  ...optionalFields,
});

// Venue onboarding schema
export const venueOnboardingSchema = z.object({
  address: z.string().max(150, "Address too long").optional(),
  bookingEmail: z.string().email("Must be a valid email").or(z.literal("")).optional(),
  bookingRates: z.string().max(250, "Booking rates note must be under 250 characters").optional(),
  capacity: z.string().max(20).optional(),
  city: z
    .string()
    .min(1, "City is required")
    .max(80, "City must be less than 80 characters")
    .default("Little Rock"),
  description: z.string().max(500, "Description must be under 500 characters").optional(),
  image: optionalUrlField,
  name: z
    .string()
    .min(1, "Venue name is required")
    .max(120, "Venue name must be less than 120 characters")
    .transform((val) => val.trim()),
  phone: z.string().max(30).optional(),
  state: z.string().max(20).default("AR"),
  website: z.string().url("Must be a valid website URL").or(z.literal("")).optional(),
});

// Legacy schema for backward compatibility (defaults to artist schema)
export const onboardingSchema = artistOnboardingSchema;

export type OnboardingFormData = z.infer<typeof onboardingSchema>;
export type ArtistOnboardingFormData = z.infer<typeof artistOnboardingSchema>;
export type FanOnboardingFormData = z.infer<typeof fanOnboardingSchema>;
export type VenueOnboardingFormData = z.infer<typeof venueOnboardingSchema>;
