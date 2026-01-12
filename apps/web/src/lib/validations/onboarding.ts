import { z } from "zod";

export const onboardingSchema = z.object({
  name: z.string().min(1, "Artist name is required").max(100, "Artist name must be less than 100 characters"),
  location: z.string().min(1, "Location is required").max(100, "Location must be less than 100 characters"),
  genre: z.enum(["COUNTRY", "EDM", "HARDCORE & ROCK", "HIP-HOP & R&B", "OTHER"], {
    message: "Please select a valid genre",
  }),
  bio: z.string().min(10, "Bio must be at least 10 characters").max(500, "Bio must be less than 500 characters"),
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
});

export type OnboardingFormData = z.infer<typeof onboardingSchema>;
