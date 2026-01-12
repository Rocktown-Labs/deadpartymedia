import { z } from "zod";

const urlSchema = z
  .union([z.string().url("Must be a valid URL"), z.literal("")])
  .optional()
  .transform((val) => (val === "" ? undefined : val));

export const artistSchema = z.object({
  name: z.string().min(1, "Artist name is required").max(255, "Name is too long"),
  slug: z.string().min(1, "Slug is required").max(255, "Slug is too long").optional(),
  bio: z.string().min(1, "Bio is required").max(2000, "Bio is too long"),
  location: z.string().min(1, "Location is required").max(255, "Location is too long"),
  genre: z.enum(["COUNTRY", "EDM", "HARDCORE & ROCK", "HIP-HOP & R&B", "OTHER"], {
    errorMap: () => ({ message: "Please select a valid genre" }),
  }),
  spotifyUrl: urlSchema,
  spotifyArtistId: z.string().max(255).optional().or(z.literal("")),
  instagram: urlSchema,
  twitter: urlSchema,
  tiktok: urlSchema,
  website: urlSchema,
  image: urlSchema,
  email: z.string().email("Must be a valid email address").optional().or(z.literal("")),
});

export type ArtistFormData = z.infer<typeof artistSchema>;

// Legacy schema for backwards compatibility
export const artistUpdateSchema = artistSchema;
export type ArtistUpdateInput = ArtistFormData;
