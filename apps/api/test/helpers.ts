import { env } from "cloudflare:test";
import { expect } from "vite-plus/test";
import { hc } from "hono/client";
import { app, type AppType } from "../src/index";
export async function signUp(email: string) {
  const response = await app.request(
    "http://localhost:3000/api/auth/sign-up/email",
    {
      method: "POST",
      headers: { "content-type": "application/json", origin: "http://localhost:3001" },
      body: JSON.stringify({ email, name: "Test User", password: "correct horse battery staple" }),
    },
    env,
  );
  expect(response.status).toBe(200);
  const body = (await response.json()) as { user: { id: string } };
  return {
    userId: body.user.id,
    email,
    cookie: response.headers
      .getSetCookie()
      .map((value) => value.split(";")[0])
      .join("; "),
  };
}
export type TestIdentity = Awaited<ReturnType<typeof signUp>>;
export function client(cookie = "") {
  return hc<AppType>("http://localhost:3000", {
    headers: { cookie },
    fetch: (input: RequestInfo | URL, init?: RequestInit) => app.request(input, init, env),
  });
}
export async function grant(identity: TestIdentity, app: "arts" | "music", role: string) {
  await env.AUTH_DB.prepare(
    "INSERT OR IGNORE INTO app_membership (user_id, app, role) VALUES (?, ?, ?)",
  )
    .bind(identity.userId, app, role)
    .run();
}
