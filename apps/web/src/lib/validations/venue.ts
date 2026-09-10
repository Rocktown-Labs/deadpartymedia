import { z } from "zod";

const optionalUrlField = z
  .union([z.string().url("Must be a valid URL"), z.literal("")])
  .optional()
  .transform((val) => (val === "" ? undefined : val));

export const venueSchema = z.object({
  address: z
    .string()
    .max(150, "Address must be less than 150 characters")
    .optional()
    .or(z.literal("")),
  bookingEmail: z.string().email("Must be a valid email").optional().or(z.literal("")),
  bookingRates: z
    .string()
    .max(250, "Booking rates note must be less than 250 characters")
    .optional()
    .or(z.literal("")),
  capacity: z
    .string()
    .max(30, "Capacity must be less than 30 characters")
    .optional()
    .or(z.literal("")),
  city: z
    .string()
    .min(1, "City is required")
    .max(80, "City must be less than 80 characters")
    .default("Little Rock"),
  description: z
    .string()
    .max(1000, "Description must be under 1000 characters")
    .optional()
    .or(z.literal("")),
  genres: z
    .string()
    .max(200, "Genres description must be under 200 characters")
    .optional()
    .or(z.literal("")),
  image: optionalUrlField,
  name: z
    .string()
    .min(1, "Venue name is required")
    .max(120, "Venue name must be less than 120 characters")
    .transform((val) => val.trim()),
  phone: z
    .string()
    .max(40, "Phone number must be under 40 characters")
    .optional()
    .or(z.literal("")),
  slug: z.string().max(150, "Slug must be under 150 characters").optional().or(z.literal("")),
  state: z.string().max(20, "State must be less than 20 characters").default("AR"),
  website: optionalUrlField,
  zip: z.string().max(20, "Zip code must be under 20 characters").optional().or(z.literal("")),
});

export type VenueInput = z.infer<typeof venueSchema>;
