import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { requireRole } from "../../../auth";
import type { AppEnv } from "../../../bindings";
import { hasMusicRole } from "../../../lib/music-access";

export const loadAdminArtistsNew = new Hono<AppEnv>().get(
  "/admin/artists/new",
  zValidator("query", z.record(z.string(), z.string())),
  async (c) => {
    requireRole(c, ["super_admin", "writer"]);

    if (!hasMusicRole(c, "super_admin", "writer")) {
      throw new HTTPException(403, { message: "Access denied" });
    }
    return c.json({});
  },
);
