import { env } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vite-plus/test";
import { app } from "../src/index";
import { signUp } from "./helpers";
const arts = "https://deadpartyarts.example";
const music = "https://deadpartymedia.example";
const bindings = {
  ...env,
  ARTS_APP_URL: arts,
  WEB_APP_URL: music,
  TRUSTED_ORIGINS: `${arts},${music}`,
  BETTER_AUTH_URL: "https://api.deadpartymedia.example",
};
const cookies = (response: Response) =>
  response.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");
async function request(url: string, cookie = "") {
  return app.request(
    url.replace("/api/sso/", "/sso/"),
    { headers: { cookie, "x-deadparty-origin": new URL(url).origin } },
    bindings,
  );
}
let centralCookie: string;
let userId: string;
beforeAll(async () => {
  const identity = await signUp("cross-domain@example.test");
  userId = identity.userId;
  const login = await app.request(
    `${arts}/api/auth/sign-in/email`,
    {
      method: "POST",
      headers: { origin: arts, "content-type": "application/json" },
      body: JSON.stringify({ email: identity.email, password: "correct horse battery staple" }),
    },
    bindings,
  );
  if (!login.ok) throw new Error("Central fixture login failed");
  centralCookie = cookies(login);
});
async function begin(returnTo = "/admin") {
  const start = await request(`${music}/api/sso/start?returnTo=${encodeURIComponent(returnTo)}`);
  expect(start.status).toBe(302);
  const authorize = await request(start.headers.get("location")!, centralCookie);
  expect(authorize.status).toBe(302);
  return { start, authorize, proof: cookies(start), callback: authorize.headers.get("location")! };
}
describe("cross-domain sign-in", () => {
  it("uses a one-time handoff with host-only cookies, preserving app roles", async () => {
    await env.AUTH_DB.prepare(
      "INSERT INTO app_membership (user_id,app,role) VALUES (?,'arts','super_admin'),(?,'music','super_admin')",
    )
      .bind(userId, userId)
      .run();
    const { start, callback, proof } = await begin();
    expect(start.headers.getSetCookie().join()).not.toContain("Domain=");
    const completed = await request(callback, proof);
    expect(completed.status).toBe(302);
    expect(completed.headers.get("location")).toBe("/admin");
    expect(completed.headers.get("cache-control")).toBe("no-store");
    expect(completed.headers.get("referrer-policy")).toBe("no-referrer");
    const cookie = cookies(completed);
    expect(cookie).toContain("session_token=");
    expect(completed.headers.getSetCookie().join()).not.toContain("Domain=");
    for (const [origin, path, session] of [
      [music, "/music/pages/admin", cookie],
      [arts, "/arts/admin/overview", centralCookie],
    ] as const) {
      expect(
        (await app.request(origin + path, { headers: { cookie: session } }, bindings)).status,
      ).toBe(200);
    }
    expect((await request(callback, proof)).status).toBe(400);
  });
  it("rejects a different browser, a different destination, and a substituted token", async () => {
    const { callback, proof } = await begin();
    expect((await request(callback)).status).toBe(400);
    expect((await request(callback.replace(music, arts), proof)).status).toBe(400);
    const wrong = new URL(callback);
    wrong.searchParams.set("token", "not-the-authorized-token");
    expect((await request(wrong.href, proof)).status).toBe(400);
    expect((await request(callback, proof)).status).toBe(302);
  });
  it("does not mint a second handoff from the same authorization state", async () => {
    const { start } = await begin();
    expect((await request(start.headers.get("location")!, centralCookie)).status).toBe(400);
  });
  it("rejects expired state and untrusted origins, and bounds return URLs", async () => {
    const flow = await begin("//attacker.example");
    expect((await request(flow.callback, flow.proof)).headers.get("location")).toBe("/onboarding");
    const stale = await begin();
    const state = new URL(stale.callback).searchParams.get("state");
    await env.AUTH_DB.prepare("UPDATE auth_verification SET expires_at=0 WHERE id=?")
      .bind(`sso:${state}`)
      .run();
    expect((await request(stale.callback, stale.proof)).status).toBe(400);
    expect((await request("https://attacker.example/api/sso/start")).status).toBe(403);
  });
  it("redirects signed-out browsers to a branded central sign-in page", async () => {
    const start = await request(`${music}/api/sso/start`);
    const authorize = await request(start.headers.get("location")!);
    const target = new URL(authorize.headers.get("location")!);
    expect(target.origin).toBe(arts);
    expect(target.pathname).toBe("/auth/sign-in");
    expect(target.searchParams.get("brand")).toBe("music");
  });
  it("keeps raw token plugin endpoints private", async () => {
    expect(
      (
        await app.request(
          `${arts}/api/auth/one-time-token/generate`,
          { headers: { cookie: centralCookie } },
          bindings,
        )
      ).status,
    ).toBe(404);
  });
  it("revokes the transferred session when either app signs out", async () => {
    const { callback, proof } = await begin();
    const completed = await request(callback, proof);
    const cookie = cookies(completed);
    const logout = await app.request(
      `${music}/api/auth/sign-out`,
      {
        method: "POST",
        headers: { cookie, origin: music, "content-type": "application/json" },
        body: "{}",
      },
      bindings,
    );
    expect(logout.status).toBe(200);
    expect(
      (
        await app.request(
          `${arts}/arts/admin/overview`,
          { headers: { cookie: centralCookie } },
          bindings,
        )
      ).status,
    ).toBe(401);
  });
});
