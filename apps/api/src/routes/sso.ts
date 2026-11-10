import { createAuth } from "@dpmedia/auth";
import { Hono } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { HTTPException } from "hono/http-exception";
import type { AppEnv } from "../bindings";

const cookieName = "deadparty_sso";
const lifetime = 5 * 60 * 1000;
interface Transfer {
  origin: string;
  returnTo: string;
  challenge: string;
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
function frontend(c: {
  req: { header: (key: string) => string | undefined; url: string };
  env: { ARTS_APP_URL: string; WEB_APP_URL: string };
}) {
  const origin = c.req.header("x-deadparty-origin") || new URL(c.req.url).origin;
  if (![c.env.ARTS_APP_URL, c.env.WEB_APP_URL].includes(origin))
    throw new HTTPException(403, { message: "Invalid sign-in origin" });
  return origin;
}
export const ssoRouter = new Hono<AppEnv>()
  .use("*", async (c, next) => {
    c.header("Cache-Control", "no-store");
    c.header("Referrer-Policy", "no-referrer");
    await next();
  })
  .get("/start", async (c) => {
    const origin = frontend(c);
    const state = random();
    const verifier = random();
    const transfer: Transfer = {
      origin,
      returnTo: localPath(c.req.query("returnTo")),
      challenge: await hash(verifier),
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
    const target = new URL("/api/sso/authorize", c.env.ARTS_APP_URL);
    target.searchParams.set("state", state);
    target.searchParams.set("view", c.req.query("view") === "sign-up" ? "sign-up" : "sign-in");
    return c.redirect(target.href, 302);
  })
  .get("/authorize", async (c) => {
    if (frontend(c) !== c.env.ARTS_APP_URL) throw new HTTPException(403);
    const state = c.req.query("state") || "";
    const row = await c.env.AUTH_DB.prepare(
      "SELECT value FROM auth_verification WHERE id=? AND expires_at>?",
    )
      .bind(`sso:${state}`, Date.now())
      .first<{ value: string }>();
    if (!row) throw new HTTPException(400, { message: "Sign-in expired. Please start again." });
    const transfer = JSON.parse(row.value) as Transfer;
    if (transfer.tokenHash) throw new HTTPException(400, { message: "Sign-in already authorized" });
    if (![c.env.ARTS_APP_URL, c.env.WEB_APP_URL].includes(transfer.origin))
      throw new HTTPException(400);
    const auth = createAuth(c.env, c.req.raw);
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) {
      const view = c.req.query("view") === "sign-up" ? "sign-up" : "sign-in";
      const target = new URL(`/auth/${view}`, c.env.ARTS_APP_URL);
      target.searchParams.set(
        "redirectTo",
        `/api/sso/authorize?state=${encodeURIComponent(state)}`,
      );
      target.searchParams.set("brand", transfer.origin === c.env.WEB_APP_URL ? "music" : "arts");
      return c.redirect(target.href, 302);
    }
    const { token } = await auth.api.generateOneTimeToken({ headers: c.req.raw.headers });
    transfer.tokenHash = await hash(token);
    const updated = await c.env.AUTH_DB.prepare(
      "UPDATE auth_verification SET value=? WHERE id=? AND value=? AND expires_at>?",
    )
      .bind(JSON.stringify(transfer), `sso:${state}`, row.value, Date.now())
      .run();
    if (updated.meta.changes !== 1)
      throw new HTTPException(400, { message: "Sign-in already authorized" });
    const target = new URL("/api/sso/callback", transfer.origin);
    target.searchParams.set("state", state);
    target.searchParams.set("token", token);
    return c.redirect(target.href, 302);
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
    for (const cookie of response.headers.getSetCookie())
      c.header("Set-Cookie", cookie, { append: true });
    setCookie(c, cookieName, "", {
      httpOnly: true,
      secure: origin.startsWith("https:"),
      sameSite: "Lax",
      path: "/api/sso",
      maxAge: 0,
    });
    return c.redirect(localPath(transfer.returnTo), 302);
  });
