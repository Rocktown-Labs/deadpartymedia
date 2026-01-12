import { z } from "zod";

export const postSchema = z.object({
  title: z.string().min(1, "Title is required").max(255, "Title must be less than 255 characters"),
  slug: z.string().min(1, "Slug is required").max(255, "Slug must be less than 255 characters"),
  category: z.enum(["COUNTRY", "EDM", "HARDCORE & ROCK", "HIP-HOP & R&B", "OTHER"], {
    message: "Please select a valid category",
  }),
  excerpt: z.string().min(1, "Excerpt is required").max(500, "Excerpt must be less than 500 characters"),
  content: z.string().min(1, "Content is required"),
  coverImage: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  status: z.enum(["draft", "published", "archived"], {
    message: "Please select a valid status",
  }),
  isCoverStory: z.boolean().default(false),
});

export type PostFormData = z.infer<typeof postSchema>;
