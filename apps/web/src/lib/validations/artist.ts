import { z } from "zod";

const genreEnum = z.enum([
  "Country",
  "EDM",
  "Hardcore & Rock",
  "Hip-Hop & R&B",
  "Other",
]);

const urlSchema = z
  .union([z.string().url("Must be a valid URL"), z.literal("")])
  .optional()
  .transform((val) => (val === "" ? undefined : val));

export const artistUpdateSchema = z.object({
  name: z
    .string()
    .min(1, "Artist name is required")
    .max(255, "Name is too long"),
  bio: z.string().min(1, "Bio is required"),
  location: z
    .string()
    .min(1, "Location is required")
    .max(255, "Location is too long"),
  genre: genreEnum,
  spotify_url: urlSchema,
  spotify_artist_id: z.string().max(255).optional(),
  instagram: urlSchema,
  twitter: urlSchema,
  tiktok: urlSchema,
  website: urlSchema,
  image: z.instanceof(File).optional().nullable(),
});

export type ArtistUpdateInput = z.infer<typeof artistUpdateSchema>;
