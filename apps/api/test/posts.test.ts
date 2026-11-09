import { beforeEach, afterEach, describe, expect, it, vi } from "vite-plus/test";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { clerkAuth } from "../src/auth";
import type { AppEnv } from "../src/bindings";
import { normalizeStoredPostContent } from "../src/lib/post-content";
import { musicCommentsRoutes } from "../src/routes/music/comments";
import { musicPostsRoutes } from "../src/routes/music/posts";
import { musicWritersRoutes } from "../src/routes/music/writers";

/**
 * Offline tests for the ported content routes (posts, writers, comments).
 *
 * No test touches the database: requests either fail before any DB access
 * (auth, id validation) or fail while creating the DB client because
 * DATABASE_URL is empty, exercising each route's error JSON exactly as
 * the original Next.js handlers produce on failure.
 */
const env = {
  DATABASE_URL: "",
  CLERK_SECRET_KEY: "sk_test_missing",
  CLERK_PUBLISHABLE_KEY: "",
};

/**
 * Mirrors the wiring in src/index.ts (auth middleware + error handler).
 * The parent session mounts these routers in src/routes/music/index.ts;
 * here they are mounted the same way that file will.
 */
function musicApp() {
  const music = new Hono<AppEnv>();
  music.route("/posts", musicPostsRoutes);
  music.route("/writers", musicWritersRoutes);
  music.route("/", musicCommentsRoutes);

  const app = new Hono<AppEnv>();
  app.use("*", clerkAuth());
  app.route("/music", music);
  app.onError((error, c) => {
    if (error instanceof HTTPException) {
      return error.getResponse();
    }
    console.error("[api] unhandled error:", error);
    return c.json({ error: "Internal server error" }, 500);
  });
  return app;
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("POST /music/articles/:slug/comments", () => {
  it("401s with the source error shape before touching the database", async () => {
    const app = musicApp();
    const response = await app.request(
      "/music/articles/some-slug/comments",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content: "hello" }),
      },
      env,
    );
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });
});

describe("GET /music/posts", () => {
  it("returns the source 500 error JSON when the DB is unavailable", async () => {
    const app = musicApp();
    const response = await app.request("/music/posts", {}, env);
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Failed to fetch posts" });
  });
});

describe("GET /music/posts/:slug", () => {
  it("returns the source 500 error JSON when the DB is unavailable", async () => {
    const app = musicApp();
    const response = await app.request("/music/posts/some-slug", {}, env);
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Failed to fetch post" });
  });
});

describe("GET /music/articles/:slug/comments", () => {
  it("returns the source 500 error JSON when the DB is unavailable", async () => {
    const app = musicApp();
    const response = await app.request("/music/articles/some-slug/comments", {}, env);
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Failed to fetch article comments" });
  });
});

describe("GET /music/writers", () => {
  it("fails through the app error handler when the DB is unavailable", async () => {
    const app = musicApp();
    const response = await app.request("/music/writers", {}, env);
    // The source route has no try/catch: a DB error is an unhandled 500.
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Internal server error" });
  });
});

describe("GET /music/writers/:id", () => {
  it("400s with the source error shape before touching the database", async () => {
    const app = musicApp();
    const response = await app.request("/music/writers/not-a-number", {}, env);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid writer id" });
  });
});

describe("normalizeStoredPostContent", () => {
  it("recognizes plain TipTap JSON docs", () => {
    const doc = {
      content: [{ content: [{ text: "hi", type: "text" }], type: "paragraph" }],
      type: "doc",
    };
    const normalized = normalizeStoredPostContent(JSON.stringify(doc));
    expect(normalized.kind).toBe("tiptap_json");
    expect(normalized.tiptapDoc).toEqual(doc);
    expect(normalized.changed).toBe(false);
  });

  it("unwraps doubly-nested TipTap JSON", () => {
    const inner = {
      content: [{ content: [{ text: "hi", type: "text" }], type: "paragraph" }],
      type: "doc",
    };
    const outer = {
      content: [{ content: [{ text: JSON.stringify(inner), type: "text" }], type: "paragraph" }],
      type: "doc",
    };
    const normalized = normalizeStoredPostContent(JSON.stringify(outer));
    expect(normalized.kind).toBe("nested_tiptap_json");
    expect(normalized.tiptapDoc).toEqual(inner);
  });

  it("parses stringified TipTap JSON", () => {
    const doc = {
      content: [{ content: [{ text: "hi", type: "text" }], type: "paragraph" }],
      type: "doc",
    };
    const normalized = normalizeStoredPostContent(JSON.stringify(JSON.stringify(doc)));
    expect(normalized.kind).toBe("stringified_tiptap_json");
    expect(normalized.tiptapDoc).toEqual(doc);
  });

  it("passes HTML/text content through untouched", () => {
    const normalized = normalizeStoredPostContent("<p>hi</p>");
    expect(normalized.kind).toBe("html_or_text");
    expect(normalized.tiptapDoc).toBeNull();
    expect(normalized.canonicalStorage).toBe("<p>hi</p>");
  });
});
