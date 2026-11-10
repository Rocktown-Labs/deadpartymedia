import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import type { AppEnv } from "../../../bindings";

export const loadMusicSlug = new Hono<AppEnv>().get(
  "/music/:slug",
  zValidator("query", z.record(z.string(), z.string())),
  async (c) => {
    const { slug } = c.req.param();
    return c.json({ slug });
  },
);
