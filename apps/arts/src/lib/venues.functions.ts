import { readResponse } from "@dpmedia/api-client";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getArtsApi, withCreatedAt } from "./api.server";

export interface VenueListItem {
  id: number;
  name: string;
  slug: string;
  address: string | null;
  city: string;
  state: string;
  zip: string | null;
  website: string | null;
  phone: string | null;
  createdAt: Date;
}

export const listArtsVenues = createServerFn({ method: "GET" }).handler(async () => {
  return (await readResponse(await getArtsApi().venues.$get())).map((row) => withCreatedAt(row));
});

export const createArtsVenue = createServerFn({ method: "POST" })
  .validator(
    z.object({
      address: z.string().optional(),
      city: z.string().default("Little Rock"),
      name: z.string().min(1, "Venue name is required"),
      phone: z.string().optional(),
      state: z.string().default("AR"),
      website: z.string().optional(),
      zip: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    return readResponse(await getArtsApi().admin.venues.$post({ json: data }));
  });

export const updateArtsVenue = createServerFn({ method: "POST" })
  .validator(
    z.object({
      address: z.string().optional(),
      city: z.string().min(1, "City is required"),
      id: z.number(),
      name: z.string().min(1, "Name is required"),
      phone: z.string().optional(),
      state: z.string().default("AR"),
      website: z.string().optional(),
      zip: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    return readResponse(
      await getArtsApi().admin.venues[":id"].$patch({ param: { id: String(data.id) }, json: data }),
    );
  });

export const deleteArtsVenue = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.number() }))
  .handler(async ({ data }) => {
    return readResponse(
      await getArtsApi().admin.venues[":id"].$delete({ param: { id: String(data.id) } }),
    );
  });
