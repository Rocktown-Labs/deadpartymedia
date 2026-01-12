import { z } from "zod";

// Common optional fields shared by both artists and fans
const optionalFields = {
  spotifyUrl: z
    .union([z.string().url("Must be a valid URL"), z.literal("")])
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
  spotifyArtistId: z.string().optional().or(z.literal("")),
  instagram: z
    .union([z.string().url("Must be a valid URL"), z.literal("")])
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
  twitter: z
    .union([z.string().url("Must be a valid URL"), z.literal("")])
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
  tiktok: z
    .union([z.string().url("Must be a valid URL"), z.literal("")])
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
  website: z
    .union([z.string().url("Must be a valid URL"), z.literal("")])
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
  image: z
    .union([z.string().url("Must be a valid URL"), z.literal("")])
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
};

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
    }
  ),
  bio: z
    .string()
    .min(10, "Bio must be at least 10 characters")
    .max(500, "Bio must be less than 500 characters"),
  ...optionalFields,
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
