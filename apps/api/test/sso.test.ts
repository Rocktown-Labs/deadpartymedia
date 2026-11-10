import { env } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vite-plus/test";
import { app } from "../src/index";
import { signUp } from "./helpers";
const arts = "https://deadpartyarts.example";
const music = "https://deadpartymedia.example";
const api = "https://api.deadpartymedia.example";
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
async function request(url: string, cookie = "", suppliedBindings = bindings) {
  return app.request(
    url.replace("/api/sso/", "/sso/"),
    {
      headers: {
        cookie,
        ...(new URL(url).origin === api ? {} : { "x-deadparty-origin": new URL(url).origin }),
      },
    },
    suppliedBindings,
  );
}
let centralCookie: string;
let userId: string;
beforeAll(async () => {
  const identity = await signUp("cross-domain@example.test");
  userId = identity.userId;
  const login = await app.request(
    `${api}/api/auth/sign-in/email`,
    {
      method: "POST",
      headers: { origin: api, "content-type": "application/json" },
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
    expect(target.origin).toBe(music);
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
  it.each([arts, music])(
    "establishes the API-owned session after password login from %s",
    async (origin) => {
      const start = await request(`${origin}/api/sso/start?returnTo=/admin`);
      const authorize = await request(start.headers.get("location")!);
      const target = new URL(authorize.headers.get("location")!);
      expect(target.origin).toBe(origin);
      const establish = new URL(target.searchParams.get("redirectTo")!, origin);
      const login = await app.request(
        `${origin}/api/auth/sign-in/email`,
        {
          method: "POST",
          headers: { origin, "content-type": "application/json" },
          body: JSON.stringify({
            email: "cross-domain@example.test",
            password: "correct horse battery staple",
          }),
        },
        bindings,
      );
      expect(login.status).toBe(200);
      const handoff = await request(establish.href, cookies(login));
      expect(handoff.status).toBe(302);
      expect(new URL(handoff.headers.get("location")!).origin).toBe(api);
      expect((await request(handoff.headers.get("location")!)).status).toBe(400);
      const apiSession = await request(handoff.headers.get("location")!, cookies(authorize));
      expect(apiSession.status).toBe(302);
      expect(apiSession.headers.getSetCookie().join()).toContain("session_token=");
      expect(apiSession.headers.getSetCookie().join()).not.toContain("Domain=");
      const authorized = await request(
        new URL(apiSession.headers.get("location")!, api).href,
        `${cookies(authorize)}; ${cookies(apiSession)}`,
      );
      const completed = await request(authorized.headers.get("location")!, cookies(start));
      expect(completed.status).toBe(302);
      expect(completed.headers.get("location")).toBe("/admin");
    },
  );
  it.each([arts, music])("creates Google state on the shared API for %s", async (origin) => {
    const googleBindings = {
      ...bindings,
      GOOGLE_CLIENT_ID: "fixture-google-client",
      GOOGLE_CLIENT_SECRET: "fixture-google-secret",
    };
    const start = await request(`${origin}/api/sso/start`, "", googleBindings);
    const authorize = await request(start.headers.get("location")!, "", googleBindings);
    const target = new URL(authorize.headers.get("location")!);
    const result = await app.request(
      `${origin}/api/auth/sign-in/social`,
      {
        method: "POST",
        headers: { origin, "x-deadparty-origin": origin, "content-type": "application/json" },
        body: JSON.stringify({
          provider: "google",
          callbackURL: target.searchParams.get("redirectTo"),
        }),
      },
      googleBindings,
    );
    expect(result.status).toBe(200);
    const { url } = (await result.json()) as { url: string };
    expect(new URL(url).origin).toBe(api);
    expect((await request(url, "", googleBindings)).status).toBe(400);
    const google = await request(url, cookies(authorize), googleBindings);
    expect(google.status).toBe(302);
    const location = new URL(google.headers.get("location")!);
    expect(location.hostname).toBe("accounts.google.com");
    expect(location.searchParams.get("redirect_uri")).toBe(`${api}/api/auth/callback/google`);
    expect(location.searchParams.get("state")).toBeTruthy();
    expect(google.headers.getSetCookie().join()).toContain("better-auth.state=");
  });
  it("returns a verified Arts modal signup to onboarding", async () => {
    const start = await request(
      `${arts}/api/sso/start?view=sign-up&presentation=modal&uiPath=${encodeURIComponent("/events?genre=all")}&returnTo=/onboarding`,
    );
    const authorize = await request(start.headers.get("location")!);
    const target = new URL(authorize.headers.get("location")!);
    expect(target.origin).toBe(arts);
    expect(target.pathname).toBe("/events");
    expect(target.searchParams.get("auth")).toBe("sign-up");
    expect(target.searchParams.get("backTo")).toBe("/events?genre=all");
    let otp = "";
    const mailBindings = {
      ...bindings,
      EMAIL: {
        send: async (mail: { text?: string }) => {
          otp = mail.text?.match(/\b\d{6}\b/)?.[0] || "";
        },
      },
    } as unknown as typeof bindings;
    const email = "modal-onboarding@example.test";
    const post = (path: string, body: unknown) =>
      app.request(
        `${arts}/api/auth/${path}`,
        {
          method: "POST",
          headers: { origin: arts, "x-deadparty-origin": arts, "content-type": "application/json" },
          body: JSON.stringify(body),
        },
        mailBindings,
      );
    const signup = await post("sign-up/email", {
      email,
      name: "New artmaker",
      password: "a correct signup password",
    });
    expect(signup.status).toBe(200);
    expect(cookies(signup)).not.toContain("session_token=");
    const verified = await post("email-otp/verify-email", { email, otp });
    expect(verified.status).toBe(200);
    const establish = await request(
      new URL(target.searchParams.get("redirectTo")!, arts).href,
      cookies(verified),
    );
    const central = await request(establish.headers.get("location")!, cookies(authorize));
    expect(central.status).toBe(302);
    const authorized = await request(
      new URL(central.headers.get("location")!, api).href,
      `${cookies(authorize)}; ${cookies(central)}`,
    );
    const finished = await request(authorized.headers.get("location")!, cookies(start));
    expect(finished.status).toBe(302);
    expect(finished.headers.get("location")).toBe("/onboarding");
  });
  it.each([
    { returnTo: "/events", expected: "/onboarding" },
    { returnTo: "/invitation/claim-me", expected: "/invitation/claim-me" },
  ])("routes an un-onboarded account to $expected", async ({ returnTo, expected }) => {
    const email =
      expected === "/onboarding"
        ? "new-account-redirect@example.test"
        : "invited-account-redirect@example.test";
    await signUp(email);
    const login = await app.request(
      `${api}/api/auth/sign-in/email`,
      {
        method: "POST",
        headers: { origin: api, "content-type": "application/json" },
        body: JSON.stringify({ email, password: "correct horse battery staple" }),
      },
      bindings,
    );
    expect(login.status).toBe(200);
    const start = await request(`${arts}/api/sso/start?returnTo=${encodeURIComponent(returnTo)}`);
    const authorize = await request(start.headers.get("location")!, cookies(login));
    const finished = await request(authorize.headers.get("location")!, cookies(start));
    expect(finished.status).toBe(302);
    expect(finished.headers.get("location")).toBe(expected);
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
