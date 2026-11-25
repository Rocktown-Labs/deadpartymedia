import { z } from "zod";

// Medium options are the same seven groups the public site uses, so what
// someone picks here always matches the exhibition categories (issue #140).
export const MEDIUM_OPTIONS = [
  "Painting",
  "Photography / Videography",
  "Digital",
  "Clothing",
  "Objects",
  "Drawing",
  "Mixed Practice",
] as const;

const MAX_INSTAGRAM_USERNAME_LENGTH = 30;
const ALLOWED_PHONE_CHARS = /^\+?[0-9\s().-]+$/;
const US_STATE_PATTERN = /^[A-Z]{2}$/;
const CITY_PATTERN = /^(?=.*[A-Za-z])[A-Za-z0-9\s.'-]+$/;
export const USERNAME_PATTERN = /^[a-zA-Z0-9_.]{3,30}$/;

function normalizeStringInput(input: unknown) {
  return typeof input === "string" ? input.trim() : "";
}

export function normalizeUsername(input: unknown) {
  const raw = normalizeStringInput(input);
  if (!raw) {
    return "";
  }
  return raw.startsWith("@") ? raw.slice(1).trim() : raw;
}

export const usernameSchema = z
  .string()
  .transform((value) => normalizeUsername(value))
  .refine((value) => USERNAME_PATTERN.test(value), {
    message: "Username must be 3 to 30 characters (letters, numbers, periods, or underscores)",
  });

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

export function normalizePhoneNumber(input: unknown) {
  const raw = normalizeStringInput(input);

  if (!raw || !ALLOWED_PHONE_CHARS.test(raw)) {
    return "";
  }

  const digits = raw.replaceAll(/[^0-9]/g, "");

  if (raw.startsWith("+")) {
    const candidate = `+${digits}`;
    return /^\+[1-9]\d{9,14}$/.test(candidate) ? candidate : "";
  }

  if (digits.length === 10) {
    return `+1${digits}`;
  }

  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }

  return "";
}

export const artmakerIdentityStepSchema = z.object({
  city: z
    .string()
    .transform((value) => value.trim())
    .refine((value) => value.length >= 2 && value.length <= 80 && CITY_PATTERN.test(value), {
      message: "Enter a valid city name",
    }),
  instagramUsername: z
    .string()
    .transform((value) => normalizeInstagramUsername(value))
    .refine((value) => value.length > 0, {
      message: "Enter a valid Instagram username (letters, numbers, periods, or underscores)",
    }),
  name: z
    .string()
    .transform((value) => value.trim())
    .refine((value) => value.length >= 2 && value.length <= 100, {
      message: "Name must be between 2 and 100 characters",
    }),
  phoneNumber: z
    .string()
    .transform((value) => normalizePhoneNumber(value))
    .refine((value) => /^\+[1-9]\d{9,14}$/.test(value), {
      message: "Enter a valid 10-digit phone number (numbers only)",
    }),
  pronouns: z
    .string()
    .max(40, "Pronouns must stay under 40 characters")
    .optional()
    .or(z.literal("")),
  state: z
    .string()
    .transform((value) => value.trim().toUpperCase())
    .refine((value) => US_STATE_PATTERN.test(value), {
      message: "Enter a two-letter state code (for example, AR)",
    }),
});

export const artmakerOnboardingSchema = artmakerIdentityStepSchema.extend({
  bio: z.string().max(500, "Bio must stay under 500 characters").optional().or(z.literal("")),
  customMedium: z
    .string()
    .max(80, "Custom medium must stay under 80 characters")
    .optional()
    .or(z.literal("")),
  image: z.string().optional().or(z.literal("")),
  imageKey: z.string().optional().or(z.literal("")),
  medium: z.array(z.string().min(1).max(80)).min(1, "Select at least one medium"),
  showPronouns: z.boolean(),
  status: z.enum(["draft", "published"]).optional(),
});

export type ArtmakerOnboardingInput = z.infer<typeof artmakerOnboardingSchema>;

export const fanOnboardingSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must stay under 100 characters")
    .transform((value) => value.trim()),
});

export type FanOnboardingInput = z.infer<typeof fanOnboardingSchema>;

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
