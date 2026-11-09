import { describe, expect, it } from "vite-plus/test";
import { createApp } from "../src/index";

const env = {
  DATABASE_URL: "",
  CLERK_SECRET_KEY: "sk_test_missing",
  CLERK_PUBLISHABLE_KEY: "",
};

describe("app wiring", () => {
  it("returns JSON 404 for unknown routes", async () => {
    const app = createApp();
    const response = await app.request("/nope", {}, env);
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Not found" });
  });

  it("healthz reports degraded without a usable DATABASE_URL", async () => {
    const app = createApp();
    const response = await app.request("/healthz", {}, env);
    expect(response.status).toBe(503);
    const body = (await response.json()) as { db: string; status: string };
    expect(body.status).toBe("degraded");
    expect(body.db).toBe("down");
  });

  it("echoes allowed origins for CORS", async () => {
    const app = createApp();
    const response = await app.request(
      "/healthz",
      {
        headers: {
          origin: "https://deadpartymedia.com",
          "access-control-request-method": "GET",
        },
        method: "OPTIONS",
      },
      env,
    );
    expect(response.headers.get("access-control-allow-origin")).toBe("https://deadpartymedia.com");
  });

  it("does not echo unknown origins", async () => {
    const app = createApp();
    const response = await app.request(
      "/healthz",
      {
        headers: {
          origin: "https://evil-deadpartymedia.example.com",
          "access-control-request-method": "GET",
        },
        method: "OPTIONS",
      },
      env,
    );
    expect(response.headers.get("access-control-allow-origin")).toBeNull();
  });
});
