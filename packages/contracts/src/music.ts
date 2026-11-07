import { z } from "zod";

const urlSchema = z
  .union([z.string().url("Must be a valid URL"), z.literal("")])
  .optional()
  .transform((val) => (val === "" ? undefined : val));

export const musicReleaseSchema = z.object({
  appleMusicUrl: urlSchema,
  artistId: z.coerce.number().int().positive().optional().nullable(),
  artistName: z
    .string()
    .min(1, "Artist name is required")
    .max(255, "Artist name must be less than 255 characters"),
  bandcampUrl: urlSchema,
  content: z.string().optional().or(z.literal("")),
  coverArt: urlSchema,
  excerpt: z
    .string()
    .min(1, "Excerpt is required")
    .max(1000, "Excerpt must be less than 1000 characters"),
  featured: z.boolean().default(false),
  genre: z.enum(["COUNTRY", "EDM", "HARDCORE & ROCK", "HIP-HOP & R&B", "OTHER"], {
    message: "Please select a valid genre",
  }),
  releaseDate: z.string().optional().or(z.literal("")),
  releaseType: z.enum(["Album", "Single", "EP"], {
    message: "Please select a valid release type (Album, Single, or EP)",
  }),
  slug: z.string().max(255, "Slug must be less than 255 characters").optional(),
  spotifyUrl: urlSchema,
  status: z.enum(["draft", "published", "archived"], {
    message: "Please select a valid status",
  }),
  title: z.string().min(1, "Title is required").max(255, "Title must be less than 255 characters"),
  youtubeUrl: urlSchema,
});

export type MusicReleaseFormData = z.infer<typeof musicReleaseSchema>;
