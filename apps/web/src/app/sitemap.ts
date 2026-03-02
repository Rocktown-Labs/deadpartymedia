import type { MetadataRoute } from "next";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { artists, events, posts } from "@/lib/db/schema";
import { getSiteDefaults } from "@/lib/seo";

const STATIC_ROUTES = [
  { changeFrequency: "daily", path: "/", priority: 1 },
  { changeFrequency: "monthly", path: "/about", priority: 0.6 },
  { changeFrequency: "monthly", path: "/contact", priority: 0.5 },
  { changeFrequency: "daily", path: "/events", priority: 0.9 },
  { changeFrequency: "daily", path: "/artists", priority: 0.9 },
  { changeFrequency: "daily", path: "/music", priority: 0.8 },
  { changeFrequency: "weekly", path: "/country", priority: 0.7 },
  { changeFrequency: "weekly", path: "/edm", priority: 0.7 },
  { changeFrequency: "weekly", path: "/hardcore", priority: 0.7 },
  { changeFrequency: "weekly", path: "/hip-hop-r-b", priority: 0.7 },
  { changeFrequency: "weekly", path: "/other", priority: 0.6 },
  { changeFrequency: "weekly", path: "/merch", priority: 0.7 },
  { changeFrequency: "weekly", path: "/writers", priority: 0.5 },
] as const;

const toAbsoluteUrl = (siteUrl: string, path: string): string => `${siteUrl}${path}`;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { siteUrl } = getSiteDefaults();
  const now = new Date();

  const [articleRows, artistRows, eventRows] = await Promise.all([
    db
      .select({
        slug: posts.slug,
        updatedAt: posts.updatedAt,
      })
      .from(posts)
      .where(eq(posts.status, "published")),
    db
      .select({
        slug: artists.slug,
        updatedAt: artists.updatedAt,
      })
      .from(artists),
    db
      .select({
        slug: events.slug,
        updatedAt: events.updatedAt,
      })
      .from(events)
      .where(eq(events.status, "published")),
  ]);

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    changeFrequency: route.changeFrequency,
    lastModified: now,
    priority: route.priority,
    url: toAbsoluteUrl(siteUrl, route.path),
  }));

  const articleEntries: MetadataRoute.Sitemap = articleRows.map((article) => ({
    changeFrequency: "weekly",
    lastModified: article.updatedAt ?? now,
    priority: 0.8,
    url: toAbsoluteUrl(siteUrl, `/article/${article.slug}`),
  }));

  const eventEntries: MetadataRoute.Sitemap = eventRows.map((event) => ({
    changeFrequency: "daily",
    lastModified: event.updatedAt ?? now,
    priority: 0.8,
    url: toAbsoluteUrl(siteUrl, `/events/${event.slug}`),
  }));

  const artistEntries: MetadataRoute.Sitemap = artistRows.map((artist) => ({
    changeFrequency: "weekly",
    lastModified: artist.updatedAt ?? now,
    priority: 0.7,
    url: toAbsoluteUrl(siteUrl, `/artists/${artist.slug}`),
  }));

  return [...staticEntries, ...articleEntries, ...eventEntries, ...artistEntries];
}
