import { z } from "zod";

const urlSchema = z
  .union([z.string().url("Must be a valid URL"), z.literal("")])
  .optional()
  .transform((val) => (val === "" ? undefined : val));

export const eventSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  description: z
    .string()
    .min(1, "Description is required")
    .max(2000, "Description must be less than 2000 characters"),
  genre: z.enum(["COUNTRY", "EDM", "HARDCORE & ROCK", "HIP-HOP & R&B", "OTHER"], {
    message: "Please select a valid genre",
  }),
  image: urlSchema,
  location: z
    .string()
    .min(1, "Location is required")
    .max(255, "Location must be less than 255 characters"),
  price: z.string().max(50, "Price must be less than 50 characters").optional().or(z.literal("")),
  slug: z.string().min(1, "Slug is required").max(255, "Slug must be less than 255 characters"),
  status: z.enum(["draft", "published", "past"], {
    message: "Please select a valid status",
  }),
  ticketLink: urlSchema,
  time: z.string().optional().or(z.literal("")),
  title: z.string().min(1, "Title is required").max(255, "Title must be less than 255 characters"),
  venue: z.string().min(1, "Venue is required").max(255, "Venue must be less than 255 characters"),
});

export type EventFormData = z.infer<typeof eventSchema>;
