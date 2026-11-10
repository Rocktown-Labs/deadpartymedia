import { Hono } from "hono";
import type { AppEnv } from "../../bindings";
export const musicMediaRoutes = new Hono<AppEnv>().get("/media/*", async (c) => {
  const key = decodeURIComponent(c.req.path.replace(/^\/music\/media\//, ""));
  const object = await c.env.MUSIC_MEDIA.get(key);
  if (!object) return c.notFound();
  if (c.req.header("if-none-match") === object.httpEtag) return c.body(null, 304);
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("ETag", object.httpEtag);
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Content-Security-Policy", "sandbox; default-src 'none'; style-src 'unsafe-inline'");
  return new Response(object.body, { headers });
});
