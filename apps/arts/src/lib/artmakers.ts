import { z } from "zod";

export const MEDIUM_OPTIONS = [
  "Acrylic",
  "Amigurumi",
  "Ceramics",
  "Charcoal",
  "Clothing Design",
  "Collage",
  "Colored Pencil",
  "Crochet",
  "Digital Art",
  "Digital Illustration",
  "Digital Painting",
  "Drawing",
  "Fabric",
  "Fashion",
  "Fiber Arts",
  "Glitter",
  "Gouache",
  "Graphite",
  "Graphic Design",
  "Illustration",
  "Jewelry",
  "Mixed Media",
  "Multidisciplinary",
  "Murals",
  "Painting",
  "Paper",
  "Pastels",
  "Pen and Pencil",
  "Photography",
  "Printmaking",
  "Sculpture",
  "Tattoo",
  "Textiles",
  "Tie Dye",
  "Tapestries",
  "Traditional Illustration",
  "Videography",
  "Vinyl",
  "Watercolor",
  "Window Painting",
] as const;

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
