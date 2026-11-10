import { createAuth } from "@dpmedia/auth";
import { Hono, type Context } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { HTTPException } from "hono/http-exception";
import type { AppEnv } from "../bindings";

const cookieName = "deadparty_sso";
const apiCookieName = "deadparty_sso_api";
const lifetime = 5 * 60 * 1000;
interface Transfer {
  origin: string;
  returnTo: string;
  challenge: string;
  presentation?: "modal" | "page";
  uiPath?: string;
  apiChallenge?: string;
  apiTokenHash?: string;
  tokenHash?: string;
}
const random = () => crypto.randomUUID() + crypto.randomUUID();
async function hash(value: string) {
  return Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))),
  )
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
function localPath(value: string | undefined, fallback = "/onboarding") {
  if (!value || !value.startsWith("/") || value.startsWith("//") || /[\\\r\n]/.test(value))
    return fallback;
  const url = new URL(value, "https://local.invalid");
  return url.origin === "https://local.invalid" ? url.pathname + url.search + url.hash : fallback;
}
function frontend(c: Context<AppEnv>) {
  const origin = c.req.header("x-deadparty-origin") || new URL(c.req.url).origin;
  if (![c.env.ARTS_APP_URL, c.env.WEB_APP_URL].includes(origin))
    throw new HTTPException(403, { message: "Invalid sign-in origin" });
  return origin;
}
function apiOrigin(c: Context<AppEnv>) {
  const origin = new URL(c.env.BETTER_AUTH_URL).origin;
  if (new URL(c.req.url).origin !== origin || c.req.header("x-deadparty-origin"))
    throw new HTTPException(403, { message: "Use the shared API sign-in endpoint" });
  return origin;
}
async function load(c: Context<AppEnv>, state = c.req.query("state") || "") {
  if (!/^[a-f0-9-]{72}$/.test(state))
    throw new HTTPException(400, { message: "Invalid sign-in state" });
  const row = await c.env.AUTH_DB.prepare(
    "SELECT value FROM auth_verification WHERE id=? AND expires_at>?",
  )
    .bind(`sso:${state}`, Date.now())
    .first<{ value: string }>();
  if (!row) throw new HTTPException(400, { message: "Sign-in expired. Please start again." });
  const transfer = JSON.parse(row.value) as Transfer;
  if (![c.env.ARTS_APP_URL, c.env.WEB_APP_URL].includes(transfer.origin) || transfer.tokenHash)
    throw new HTTPException(400, { message: "Sign-in already authorized or invalid" });
  return { state, value: row.value, transfer };
}
async function save(c: Context<AppEnv>, record: Awaited<ReturnType<typeof load>>) {
  const updated = await c.env.AUTH_DB.prepare(
    "UPDATE auth_verification SET value=? WHERE id=? AND value=? AND expires_at>?",
  )
    .bind(JSON.stringify(record.transfer), `sso:${record.state}`, record.value, Date.now())
    .run();
  if (updated.meta.changes !== 1)
    throw new HTTPException(400, { message: "Sign-in already authorized" });
  record.value = JSON.stringify(record.transfer);
}
async function apiProof(c: Context<AppEnv>, transfer: Transfer, state: string) {
  const proof = getCookie(c, apiCookieName);
  if (
    !proof?.startsWith(`${state}.`) ||
    transfer.apiChallenge !== (await hash(proof.slice(state.length + 1)))
  )
    throw new HTTPException(400, { message: "Sign-in browser mismatch" });
}
function appendCookies(c: Context<AppEnv>, response: Response) {
  for (const cookie of response.headers.getSetCookie())
    c.header("Set-Cookie", cookie, { append: true });
}
/** The UI requests a top-level API hop, so Google's state cookie is created on the API host. */
export async function googleSignInStart(c: Context<AppEnv>, body: { callbackURL?: unknown }) {
  const origin = frontend(c);
  if (!c.env.GOOGLE_CLIENT_ID || !c.env.GOOGLE_CLIENT_SECRET)
    throw new HTTPException(400, { message: "Google sign-in is not configured" });
  const callback = new URL(typeof body.callbackURL === "string" ? body.callbackURL : "/", origin);
  if (callback.origin !== origin || callback.pathname !== "/api/sso/establish")
    throw new HTTPException(400, { message: "Start Google sign-in from the sign-in page" });
  const { state, transfer } = await load(c, callback.searchParams.get("state") || "");
  if (transfer.origin !== origin) throw new HTTPException(403);
  const target = new URL("/sso/google", c.env.BETTER_AUTH_URL);
  target.searchParams.set("state", state);
  return c.json({ url: target.href, redirect: true });
}
export const ssoRouter = new Hono<AppEnv>()
  .use("*", async (c, next) => {
    c.header("Cache-Control", "no-store");
    c.header("Referrer-Policy", "no-referrer");
    await next();
  })
  .get("/configuration", (c) =>
    c.json({
      artsOrigin: c.env.ARTS_APP_URL,
      webOrigin: c.env.WEB_APP_URL,
      apiOrigin: new URL(c.env.BETTER_AUTH_URL).origin,
    }),
  )
  .get("/start", async (c) => {
    const origin = frontend(c);
    const state = random();
    const verifier = random();
    const transfer: Transfer = {
      origin,
      returnTo: localPath(c.req.query("returnTo")),
      challenge: await hash(verifier),
      presentation:
        origin === c.env.ARTS_APP_URL && c.req.query("presentation") === "modal" ? "modal" : "page",
      uiPath: localPath(c.req.query("uiPath"), "/"),
    };
    await c.env.AUTH_DB.prepare(
      "INSERT INTO auth_verification (id,identifier,value,expires_at) VALUES (?,?,?,?)",
    )
      .bind(`sso:${state}`, `sso:${state}`, JSON.stringify(transfer), Date.now() + lifetime)
      .run();
    setCookie(c, cookieName, `${state}.${verifier}`, {
      httpOnly: true,
      secure: origin.startsWith("https:"),
      sameSite: "Lax",
      path: "/api/sso",
      maxAge: lifetime / 1000,
    });
    const target = new URL("/sso/authorize", c.env.BETTER_AUTH_URL);
    target.searchParams.set("state", state);
    target.searchParams.set("view", c.req.query("view") === "sign-up" ? "sign-up" : "sign-in");
    return c.redirect(target.href, 302);
  })
  .get("/authorize", async (c) => {
    const origin = apiOrigin(c);
    const record = await load(c);
    if (!record.transfer.apiChallenge) {
      const verifier = random();
      record.transfer.apiChallenge = await hash(verifier);
      await save(c, record);
      setCookie(c, apiCookieName, `${record.state}.${verifier}`, {
        httpOnly: true,
        secure: origin.startsWith("https:"),
        sameSite: "Lax",
        path: "/sso",
        maxAge: lifetime / 1000,
      });
    } else await apiProof(c, record.transfer, record.state);
    const auth = createAuth(c.env);
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) {
      const view = c.req.query("view") === "sign-up" ? "sign-up" : "sign-in";
      const modal =
        record.transfer.presentation === "modal" && record.transfer.origin === c.env.ARTS_APP_URL;
      const target = new URL(
        modal ? record.transfer.uiPath || "/" : `/auth/${view}`,
        record.transfer.origin,
      );
      if (modal) target.searchParams.set("auth", view);
      target.searchParams.set("backTo", record.transfer.uiPath || "/");
      target.searchParams.set(
        "redirectTo",
        `/api/sso/establish?state=${encodeURIComponent(record.state)}`,
      );
      target.searchParams.set(
        "brand",
        record.transfer.origin === c.env.WEB_APP_URL ? "music" : "arts",
      );
      return c.redirect(target.href, 302);
    }
    const membership = await c.env.AUTH_DB.prepare(
      "SELECT 1 AS present FROM app_membership WHERE user_id=? AND app=? LIMIT 1",
    )
      .bind(session.user.id, record.transfer.origin === c.env.ARTS_APP_URL ? "arts" : "music")
      .first();
    if (!membership && !record.transfer.returnTo.startsWith("/invitation/"))
      record.transfer.returnTo = "/onboarding";
    const { token } = await auth.api.generateOneTimeToken({ headers: c.req.raw.headers });
    record.transfer.tokenHash = await hash(token);
    await save(c, record);
    const target = new URL("/api/sso/callback", record.transfer.origin);
    target.searchParams.set("state", record.state);
    target.searchParams.set("token", token);
    return c.redirect(target.href, 302);
  })
  .get("/google", async (c) => {
    const origin = apiOrigin(c);
    const record = await load(c);
    await apiProof(c, record.transfer, record.state);
    const response = await createAuth(c.env).api.signInSocial({
      body: {
        provider: "google",
        callbackURL: `${origin}/sso/authorize?state=${encodeURIComponent(record.state)}`,
        disableRedirect: true,
        errorCallbackURL: `${record.transfer.origin}/auth/error?redirectTo=${encodeURIComponent(`/api/sso/establish?state=${record.state}`)}`,
      },
      headers: c.req.raw.headers,
      asResponse: true,
    });
    const result = (await response.json()) as { url?: string };
    if (!response.ok || !result.url)
      throw new HTTPException(400, { message: "Could not start Google sign-in" });
    appendCookies(c, response);
    return c.redirect(result.url, 302);
  })
  .get("/establish", async (c) => {
    const origin = frontend(c);
    const record = await load(c);
    if (record.transfer.origin !== origin) throw new HTTPException(403);
    if (!record.transfer.apiChallenge || record.transfer.apiTokenHash)
      throw new HTTPException(400, { message: "Invalid or completed sign-in" });
    const auth = createAuth(c.env, c.req.raw);
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) throw new HTTPException(401, { message: "Sign in first" });
    const { token } = await auth.api.generateOneTimeToken({ headers: c.req.raw.headers });
    record.transfer.apiTokenHash = await hash(token);
    await save(c, record);
    const target = new URL("/sso/session-callback", c.env.BETTER_AUTH_URL);
    target.searchParams.set("state", record.state);
    target.searchParams.set("token", token);
    return c.redirect(target.href, 302);
  })
  .get("/session-callback", async (c) => {
    apiOrigin(c);
    const record = await load(c);
    await apiProof(c, record.transfer, record.state);
    const token = c.req.query("token") || "";
    if (record.transfer.apiTokenHash !== (await hash(token)))
      throw new HTTPException(400, { message: "Invalid sign-in token" });
    delete record.transfer.apiTokenHash;
    await save(c, record);
    const response = await createAuth(c.env).api.verifyOneTimeToken({
      body: { token },
      headers: c.req.raw.headers,
      asResponse: true,
    });
    if (!response.ok) throw new HTTPException(400, { message: "Sign-in expired" });
    appendCookies(c, response);
    return c.redirect(`/sso/authorize?state=${encodeURIComponent(record.state)}`, 302);
  })
  .get("/callback", async (c) => {
    const origin = frontend(c);
    const state = c.req.query("state") || "";
    const token = c.req.query("token") || "";
    const proof = getCookie(c, cookieName);
    if (!proof?.startsWith(`${state}.`))
      throw new HTTPException(400, { message: "Sign-in browser mismatch" });
    const row = await c.env.AUTH_DB.prepare(
      "SELECT value FROM auth_verification WHERE id=? AND expires_at>?",
    )
      .bind(`sso:${state}`, Date.now())
      .first<{ value: string }>();
    if (!row) throw new HTTPException(400, { message: "Sign-in expired" });
    const transfer = JSON.parse(row.value) as Transfer;
    if (
      transfer.origin !== origin ||
      transfer.challenge !== (await hash(proof.slice(state.length + 1))) ||
      transfer.tokenHash !== (await hash(token))
    )
      throw new HTTPException(400, { message: "Invalid sign-in proof" });
    const consumed = await c.env.AUTH_DB.prepare(
      "DELETE FROM auth_verification WHERE id=? AND value=? AND expires_at>?",
    )
      .bind(`sso:${state}`, row.value, Date.now())
      .run();
    if (consumed.meta.changes !== 1)
      throw new HTTPException(400, { message: "Sign-in already completed" });
    const response = await createAuth(c.env, c.req.raw).api.verifyOneTimeToken({
      body: { token },
      headers: c.req.raw.headers,
      asResponse: true,
    });
    if (!response.ok) throw new HTTPException(400, { message: "Sign-in expired" });
    appendCookies(c, response);
    setCookie(c, cookieName, "", {
      httpOnly: true,
      secure: origin.startsWith("https:"),
      sameSite: "Lax",
      path: "/api/sso",
      maxAge: 0,
    });
    return c.redirect(localPath(transfer.returnTo), 302);
  });
