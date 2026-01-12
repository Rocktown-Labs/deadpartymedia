import { z } from "zod";

const urlSchema = z
  .union([z.string().url("Must be a valid URL"), z.literal("")])
  .optional()
  .transform((val) => (val === "" ? undefined : val));

export const eventSchema = z.object({
  title: z.string().min(1, "Title is required").max(255, "Title must be less than 255 characters"),
  slug: z.string().min(1, "Slug is required").max(255, "Slug must be less than 255 characters"),
  description: z.string().min(1, "Description is required").max(2000, "Description must be less than 2000 characters"),
  image: urlSchema,
  venue: z.string().min(1, "Venue is required").max(255, "Venue must be less than 255 characters"),
  location: z.string().min(1, "Location is required").max(255, "Location must be less than 255 characters"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  time: z.string().optional().or(z.literal("")),
  ticketLink: urlSchema,
  price: z.string().max(50, "Price must be less than 50 characters").optional().or(z.literal("")),
  genre: z.enum(["COUNTRY", "EDM", "HARDCORE & ROCK", "HIP-HOP & R&B", "OTHER"], {
    errorMap: () => ({ message: "Please select a valid genre" }),
  }),
  status: z.enum(["draft", "published", "past"], {
    errorMap: () => ({ message: "Please select a valid status" }),
  }),
});

export type EventFormData = z.infer<typeof eventSchema>;
