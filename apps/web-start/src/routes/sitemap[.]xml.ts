import { createFileRoute } from "@tanstack/react-router";
import { apiUrl } from "../lib/api";

interface SitemapEntry {
  slug: string;
  updated_at?: string | null;
}

/**
 * Ported from apps/web/src/app/sitemap.ts (DB-driven) — now reads the
 * platform API worker instead of querying the database directly.
 */
export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const base = "https://www.deadpartymedia.com";
        const fetchSlugs = async (path: string): Promise<SitemapEntry[]> => {
          try {
            const response = await fetch(`${apiUrl()}${path}`);
            if (!response.ok) {
              return [];
            }
            const data = (await response.json()) as SitemapEntry[] | { results?: SitemapEntry[] };
            return Array.isArray(data) ? data : (data.results ?? []);
          } catch {
            return [];
          }
        };

        const [posts, artists, events, releases] = await Promise.all([
          fetchSlugs("/music/posts?limit=200"),
          fetchSlugs("/music/artists?limit=200"),
          fetchSlugs("/music/events?limit=200"),
          fetchSlugs("/music/releases?limit=200"),
        ]);

        const staticPaths = ["", "/about", "/articles", "/artists", "/events", "/music", "/venues"];
        const urls = [
          ...staticPaths.map((path) => ({ path, updated: undefined })),
          ...posts.map((item) => ({ path: `/article/${item.slug}`, updated: item.updated_at })),
          ...artists.map((item) => ({ path: `/artists/${item.slug}`, updated: item.updated_at })),
          ...events.map((item) => ({ path: `/events/${item.slug}`, updated: item.updated_at })),
          ...releases.map((item) => ({ path: `/music/${item.slug}`, updated: item.updated_at })),
        ];

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map((entry) => {
    const lastmod = entry.updated
      ? `\n  <lastmod>${new Date(entry.updated).toISOString()}</lastmod>`
      : "";
    return ` <url>\n  <loc>${base}${entry.path}</loc>${lastmod}\n </url>`;
  })
  .join("\n")}
</urlset>`;

        return new Response(xml, {
          headers: { "content-type": "application/xml" },
        });
      },
    },
  },
});
