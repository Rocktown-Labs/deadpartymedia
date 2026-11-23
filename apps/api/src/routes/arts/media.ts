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
const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;
export const artsMediaRoutes = new Hono<AppEnv>()
  .post(
    "/uploads/:kind",
    bodyLimit({
      maxSize: MAX_UPLOAD_BYTES + 64 * 1024,
      onError: (c) => c.json({ error: "File must be smaller than 12 MB" }, 413),
    }),
    zValidator(
      "param",
      z.object({ kind: z.enum(["artwork", "profileImages", "articleImages", "eventFlyers"]) }),
    ),
    async (c) => {
      const caller = requireAuth(c);
      const { kind } = c.req.valid("param");
      if (
        kind === "profileImages" &&
        (caller.roles.length === 0 || caller.roles.every((role) => role === "fan"))
      ) {
        // Registration or fan-to-artmaker onboarding can upload its profile photo before granting the artmaker role.
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
      const limit = MAX_UPLOAD_BYTES;
      if (!file.size || file.size > limit)
        throw new HTTPException(413, {
          message: `File must be smaller than ${limit / 1024 / 1024} MB`,
        });
      const safeName = file.name
        .toLowerCase()
        .replace(/[^a-z0-9.]+/g, "-")
        .replace(/^-|-$/g, "");
      const key = `${routes[kind]}/${encodeURIComponent(caller.userId)}/${crypto.randomUUID()}-${safeName || "upload"}`;
      await c.env.ARTS_MEDIA.put(key, await file.arrayBuffer(), {
        httpMetadata: { contentType: file.type },
        customMetadata: { ownerId: caller.userId },
      });
      const publicBaseUrl =
        c.env.CLOUDFLARE_R2_PUBLIC_URL || `${c.env.ARTS_APP_URL.replace(/\/$/, "")}/api/arts/media`;
      return c.json({ key, url: `${publicBaseUrl}/${key}`, publicBaseUrl });
    },
  )
  .get("/media/*", async (c) => {
    const rawKey = c.req.path.replace(/^\/arts\/media\//, "");
    if (!rawKey) return c.notFound();
    let key: string;
    try {
      key = decodeURIComponent(rawKey);
    } catch {
      return c.notFound();
    }
    const object =
      (await c.env.ARTS_MEDIA.get(key)) ??
      (key !== rawKey ? await c.env.ARTS_MEDIA.get(rawKey) : null);
    if (!object) return c.notFound();
    if (c.req.header("if-none-match") === object.httpEtag) return c.body(null, 304);
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("ETag", object.httpEtag);
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set(
      "Content-Security-Policy",
      "sandbox; default-src 'none'; style-src 'unsafe-inline'",
    );
    return new Response(object.body, { headers });
  });
