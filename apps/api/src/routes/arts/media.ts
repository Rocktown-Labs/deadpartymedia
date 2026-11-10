import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { requireAuth, requireRole } from "../../auth";
import type { AppEnv } from "../../bindings";

const routes = {
  artwork: "artworks",
  profileImages: "artmaker-profiles",
  articleImages: "arts-articles",
  eventFlyers: "event-flyers",
} as const;
const imageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);
export const artsMediaRoutes = new Hono<AppEnv>()
  .post(
    "/uploads/:kind",
    bodyLimit({ maxSize: 12 * 1024 * 1024 + 64 * 1024 }),
    zValidator(
      "param",
      z.object({ kind: z.enum(["artwork", "profileImages", "articleImages", "eventFlyers"]) }),
    ),
    async (c) => {
      const caller = requireAuth(c);
      const { kind } = c.req.valid("param");
      if (kind === "profileImages" && caller.roles.length === 0) {
        // Registration can upload its profile before onboarding grants a role.
      } else {
        requireRole(
          c,
          kind === "artwork" || kind === "profileImages"
            ? ["artmaker", "arts_admin", "arts_writer", "super_admin"]
            : ["arts_admin", "arts_writer", "super_admin"],
        );
      }
      const form = await c.req.formData();
      const file = form.get("file");
      if (!(file instanceof File))
        throw new HTTPException(400, { message: "Select a file to upload" });
      if (!imageTypes.has(file.type) && !(kind === "artwork" && file.type === "application/pdf"))
        throw new HTTPException(400, { message: "Unsupported file type" });
      const limit = (kind === "profileImages" ? 8 : 12) * 1024 * 1024;
      if (!file.size || file.size > limit)
        throw new HTTPException(413, {
          message: `File must be smaller than ${limit / 1024 / 1024} MB`,
        });
      const safeName = file.name
        .toLowerCase()
        .replace(/[^a-z0-9.]+/g, "-")
        .replace(/^-|-$/g, "");
      const key = `${routes[kind]}/${encodeURIComponent(caller.userId)}/${crypto.randomUUID()}-${safeName || "upload"}`;
      await c.env.ARTS_MEDIA.put(key, file.stream(), {
        httpMetadata: { contentType: file.type },
        customMetadata: { ownerId: caller.userId },
      });
      const publicBaseUrl =
        c.env.CLOUDFLARE_R2_PUBLIC_URL || `${c.env.ARTS_APP_URL.replace(/\/$/, "")}/api/arts/media`;
      return c.json({ key, url: `${publicBaseUrl}/${key}`, publicBaseUrl });
    },
  )
  .get("/media/*", async (c) => {
    const key = c.req.param("*");
    if (!key) return c.notFound();
    const object = await c.env.ARTS_MEDIA.get(key);
    if (!object) return c.notFound();
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set(
      "Content-Security-Policy",
      "sandbox; default-src 'none'; style-src 'unsafe-inline'",
    );
    return new Response(object.body, { headers });
  });
