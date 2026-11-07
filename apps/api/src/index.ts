import { cors } from "hono/cors";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { clerkAuth } from "./auth";
import type { AppEnv } from "./bindings";
import { artsRouter } from "./routes/arts";
import { health } from "./routes/health";
import { musicRouter } from "./routes/music";

function allowedOrigin(origin: string): boolean {
  try {
    const host = new URL(origin).hostname;
    return (
      host === "localhost" ||
      host.endsWith(".localhost") ||
      host === "deadpartymedia.com" ||
      host.endsWith(".deadpartymedia.com") ||
      host === "deadpartyarts.com" ||
      host.endsWith(".deadpartyarts.com")
    );
  } catch {
    return false;
  }
}

export function createApp() {
  const app = new Hono<AppEnv>();

  // Cross-origin auth: frontends call this API from their own origins
  // with credentials (Clerk Bearer tokens today, better-auth cookies in
  // Phase 4), so echo known app origins only.
  app.use(
    "*",
    cors({
      origin: (origin) => (origin && allowedOrigin(origin) ? origin : null),
      credentials: true,
      allowHeaders: ["Authorization", "Content-Type"],
      allowMethods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    }),
  );

  // Auth seam: verifies Clerk session tokens, sets c.var.auth.
  // Phase 4 swaps this for better-auth session validation.
  app.use("*", clerkAuth());

  app.route("/healthz", health);
  app.route("/music", musicRouter);
  app.route("/arts", artsRouter);

  app.notFound((c) => c.json({ error: "Not found" }, 404));

  app.onError((error, c) => {
    if (error instanceof HTTPException) {
      return error.getResponse();
    }
    console.error("[api] unhandled error:", error);
    return c.json({ error: "Internal server error" }, 500);
  });

  return app;
}

export const app = createApp();

export default app;
