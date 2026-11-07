import { describe, expect, it } from "vite-plus/test";
import { Hono } from "hono";
import { clerkAuth } from "../src/auth";
import { musicWebhooksRoutes } from "../src/routes/music/webhooks";
import type { AppEnv } from "../src/bindings";

/**
 * The source route (apps/web/src/app/api/webhooks/route.ts) catches every
 * verifyWebhook failure — missing svix headers, missing signing secret,
 * invalid signature — and answers 400 { error: "Error verifying webhook" }.
 * @clerk/backend's verifyWebhook throws on missing/invalid headers, so the
 * port maps those throws to the same response. No network is touched:
 * verification fails before any DB or Clerk API access.
 */
const env = {
  DATABASE_URL: "",
  CLERK_SECRET_KEY: "sk_test_missing",
  CLERK_PUBLISHABLE_KEY: "",
  CLERK_WEBHOOK_SIGNING_SECRET: "whsec_test_signing_secret",
};

function webhookApp() {
  const app = new Hono<AppEnv>();
  app.use("*", clerkAuth());
  app.route("/music", musicWebhooksRoutes);
  return app;
}

const payload = JSON.stringify({
  data: { email_addresses: [], id: "user_test" },
  type: "user.created",
});

describe("POST /music/webhooks", () => {
  it("rejects requests without svix signature headers", async () => {
    const app = webhookApp();
    const response = await app.request(
      "/music/webhooks",
      { body: payload, headers: { "Content-Type": "application/json" }, method: "POST" },
      env,
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Error verifying webhook" });
  });

  it("rejects requests with an invalid svix signature", async () => {
    const app = webhookApp();
    const response = await app.request(
      "/music/webhooks",
      {
        body: payload,
        headers: {
          "Content-Type": "application/json",
          "svix-id": "msg_test",
          "svix-signature": "v1,invalid",
          "svix-timestamp": String(Math.floor(Date.now() / 1000)),
        },
        method: "POST",
      },
      env,
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Error verifying webhook" });
  });
});
