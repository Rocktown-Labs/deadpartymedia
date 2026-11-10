import { z } from "zod";

export const postSchema = z.object({
  category: z.enum(["COUNTRY", "EDM", "HARDCORE & ROCK", "HIP-HOP & R&B", "OTHER"], {
    message: "Please select a valid category",
  }),
  content: z.string().min(1, "Content is required"),
  coverImage: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  excerpt: z
    .string()
    .min(1, "Excerpt is required")
    .max(500, "Excerpt must be less than 500 characters"),
  isCoverStory: z.boolean().default(false),
  slug: z.string().min(1, "Slug is required").max(255, "Slug must be less than 255 characters"),
  status: z.enum(["draft", "published", "archived"], {
    message: "Please select a valid status",
  }),
  title: z.string().min(1, "Title is required").max(255, "Title must be less than 255 characters"),
});

export type PostFormData = z.infer<typeof postSchema>;
