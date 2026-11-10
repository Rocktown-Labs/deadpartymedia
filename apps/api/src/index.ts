import { createAuth } from "@dpmedia/auth";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { secureHeaders } from "hono/secure-headers";
import { sessionAuth } from "./auth";
import type { AppEnv } from "./bindings";
import { artsRouter } from "./routes/arts";
import { musicRouter } from "./routes/music";

const base = new Hono<AppEnv>()
  .use("*", secureHeaders())
  .use("*", async (c, next) => {
    const allowed = [
      ...c.env.TRUSTED_ORIGINS.split(",").map((origin) => origin.trim()),
      new URL(c.env.BETTER_AUTH_URL).origin,
    ];
    const origin = c.req.header("origin");
    if (
      origin &&
      !allowed.includes(origin) &&
      origin !== "deadparty://" &&
      !["GET", "HEAD", "OPTIONS"].includes(c.req.method)
    )
      throw new HTTPException(403, { message: "Origin is not allowed" });
    return cors({
      origin: (origin) => (allowed.includes(origin) ? origin : null),
      credentials: true,
      allowHeaders: ["Content-Type", "Authorization"],
      allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    })(c, next);
  })
  .on(["GET", "POST"], "/api/auth/*", (c) => createAuth(c.env, c.req.raw).handler(c.req.raw))
  .get("/healthz", (c) => c.json({ status: "ok" as const }))
  .use("/arts/*", sessionAuth("arts"))
  .use("/music/*", sessionAuth("music"));

export const app = base.route("/arts", artsRouter).route("/music", musicRouter);
app.onError((error, c) => {
  if (error instanceof HTTPException) return c.json({ error: error.message }, error.status);
  console.error(
    JSON.stringify({
      event: "request_failed",
      method: c.req.method,
      path: c.req.path,
      error: error instanceof Error ? error.message : "Unknown error",
    }),
  );
  return c.json({ error: "Internal server error" }, 500);
});
export type AppType = typeof app;
export type ArtsApiType = typeof artsRouter;
export default app;

export type MusicApiType = typeof musicRouter;

export { PostDedupe } from "./jobs/post-dedupe";
export { WordPressBackfill } from "./jobs/wordpress-backfill";
