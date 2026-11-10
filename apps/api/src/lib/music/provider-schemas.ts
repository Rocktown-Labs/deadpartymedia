import { z } from "zod";
export const spotifyToken = z.object({ access_token: z.string() });
export const spotifySearch = z.object({
  artists: z
    .object({
      items: z.array(
        z.object({
          id: z.string(),
          external_urls: z.object({ spotify: z.string().optional() }).optional(),
          images: z.array(z.object({ url: z.string() })).optional(),
        }),
      ),
    })
    .optional(),
});
export const wordpressFeed = z.object({
  found: z.number().optional(),
  posts: z
    .array(
      z
        .object({
          ID: z.number(),
          title: z.string(),
          URL: z.string(),
          content: z.string(),
          excerpt: z.string().optional(),
          date: z.string(),
          modified: z.string().optional(),
          author: z.object({ name: z.string(), nice_name: z.string().optional() }).optional(),
          featured_image: z.string().optional(),
          categories: z.record(z.string(), z.unknown()).optional(),
          tags: z.record(z.string(), z.unknown()).optional(),
        })
        .passthrough(),
    )
    .default([]),
});
