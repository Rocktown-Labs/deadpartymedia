import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { requireAuth, requireRole } from "../../auth";
import type { AppEnv } from "../../bindings";
import { r2Put } from "../../lib/r2";
import { generateImagePathname, validateImageFile } from "../../lib/upload";
export const musicUploadRoutes = new Hono<AppEnv>().post(
  "/",
  bodyLimit({ maxSize: 12 * 1024 * 1024 + 65536 }),
  zValidator(
    "query",
    z.object({
      type: z.enum(["cover", "content", "profile", "event", "venue", "release"]).default("content"),
    }),
  ),
  zValidator("form", z.object({ file: z.instanceof(File) })),
  async (c) => {
    const auth = requireAuth(c),
      { type } = c.req.valid("query"),
      { file } = c.req.valid("form");
    if (!(type === "profile" && auth.roles.length === 0))
      requireRole(c, ["super_admin", "writer", "artist", "venue"]);
    const validation = validateImageFile(file);
    if (!validation.valid) throw new HTTPException(400, { message: validation.error });
    const pathname = `uploads/${auth.userId}/${crypto.randomUUID()}-${generateImagePathname(type, file.name)}`;
    const url = await r2Put(c.env, pathname, await file.arrayBuffer(), file.type);
    return c.json({ pathname, url });
  },
);
