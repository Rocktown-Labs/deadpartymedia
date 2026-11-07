import { Hono } from "hono";
import { sql } from "drizzle-orm";
import { getDb } from "../db";
import type { AppEnv } from "../bindings";

export const health = new Hono<AppEnv>();

health.get("/", async (c) => {
  try {
    const db = getDb(c.env);
    await db.execute(sql`select 1`);
    return c.json({ db: "up", status: "ok" });
  } catch {
    return c.json({ db: "down", status: "degraded" }, 503);
  }
});
