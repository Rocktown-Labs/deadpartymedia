import { createFileRoute } from "@tanstack/react-router";

/**
 * Ported from apps/web/src/app/robots.ts.
 */
export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: async () => {
        const body = `User-agent: *
Allow: /

Sitemap: https://www.deadpartymedia.com/sitemap.xml
`;
        return new Response(body, {
          headers: { "content-type": "text/plain" },
        });
      },
    },
  },
});
