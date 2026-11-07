import { Hono } from "hono";
import { requireRole } from "../../auth";
import type { AppEnv } from "../../bindings";
import { r2Configured, r2Put } from "../../lib/r2";
import { generateImagePathname, validateImageFile } from "../../lib/upload";
import type { UploadType } from "../../lib/upload";

/**
 * Ported from apps/web/src/app/api/upload/image/route.ts.
 * Vercel Blob `put()` is replaced by R2 (`r2Put`); response shapes are
 * identical to the Next.js route so the web app's upload hooks keep working.
 */
export const musicUploadRoutes = new Hono<AppEnv>();

musicUploadRoutes.post("/", async (c) => {
  // Authenticate user. Fans have no upload need; restrict to staff and
  // onboarded creators to bound public-blob abuse / cost exhaustion.
  requireRole(c, ["super_admin", "writer", "artist", "venue"]);

  try {
    // Get upload type from query params

    const type = (c.req.query("type") || "content") as UploadType;

    // Validate upload type

    if (!["cover", "content", "profile", "event", "venue", "release"].includes(type)) {
      return c.json({ error: "Invalid upload type" }, 400);
    }

    // Get file from request body

    const formData = await c.req.raw.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return c.json({ error: "No file provided" }, 400);
    }

    // Validate file

    const validation = validateImageFile(file);
    if (!validation.valid) {
      return c.json({ error: validation.error }, 400);
    }

    // Generate pathname.
    // The source let Vercel Blob add random suffixes for content/profile/
    // event images; R2 keys are timestamp-prefixed instead (generateImagePathname
    // does not generate suffixes), which keeps keys unique without Blob's help.

    const pathname = generateImagePathname(type, file.name);

    // Upload to R2

    if (!r2Configured(c.env)) {
      return c.json({ error: "Image storage is not configured" }, 500);
    }

    const url = await r2Put(c.env, pathname, await file.arrayBuffer(), file.type);

    return c.json({
      pathname,
      url,
    });
  } catch (error) {
    // Handle specific storage errors

    if (error instanceof Error) {
      if (error.message.includes("already exists")) {
        return c.json({ error: "File with this name already exists" }, 409);
      }
    }

    return c.json({ error: "Failed to upload image. Please try again." }, 500);
  }
});
