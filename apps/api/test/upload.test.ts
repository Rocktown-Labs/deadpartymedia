import { describe, expect, it } from "vite-plus/test";
import { Hono } from "hono";
import { clerkAuth } from "../src/auth";
import type { AppEnv } from "../src/bindings";
import { musicUploadRoutes } from "../src/routes/music/upload";

/**
 * Port of apps/web/src/app/api/upload/image/route.ts (Vercel Blob → R2).
 *
 * The R2 swap cannot be exercised without credentials, and every request
 * path sits behind the Clerk auth gate, so these tests pin the gate:
 * the exact 401 body of the source route, and that the gate precedes
 * body parsing / R2 configuration (no R2 vars are set in this env).
 */
const env = {
  DATABASE_URL: "",
  CLERK_SECRET_KEY: "sk_test_missing",
  CLERK_PUBLISHABLE_KEY: "",
};

function musicApp() {
  const app = new Hono<AppEnv>();
  app.use("*", clerkAuth());
  const music = new Hono<AppEnv>();
  music.route("/upload", musicUploadRoutes);
  app.route("/music", music);
  return app;
}

describe("POST /music/upload", () => {
  it("401s with the source route's exact body when unauthenticated", async () => {
    const response = await musicApp().request("/music/upload", { method: "POST" }, env);
    expect(response.status).toBe(401);
    expect(response.headers.get("content-type")).toContain("application/json");
    // Source: NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("401s when the bearer token cannot be verified", async () => {
    const response = await musicApp().request(
      "/music/upload",
      { headers: { authorization: "Bearer not-a-real-jwt" }, method: "POST" },
      env,
    );
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("keeps the auth gate ahead of body parsing and R2 configuration", async () => {
    const form = new FormData();
    form.append(
      "file",
      new File([new Uint8Array([137, 80, 78, 71])], "test.png", { type: "image/png" }),
    );
    const response = await musicApp().request(
      "/music/upload?type=content",
      { body: form, method: "POST" },
      env,
    );
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });
});
