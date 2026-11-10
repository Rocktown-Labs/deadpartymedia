import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import type { AppEnv } from "../../../bindings";
export const loadAbout = new Hono<AppEnv>().get(
  "/about",
  zValidator("query", z.record(z.string(), z.string())),
  (c) => c.json({}),
);
