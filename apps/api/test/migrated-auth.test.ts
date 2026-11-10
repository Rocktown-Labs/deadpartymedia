import { planClerkImport } from "../../../packages/auth/src/clerk-import";
import { env } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vite-plus/test";
import { createIdentityDatabase } from "@dpmedia/auth";
import { account, membership, user } from "@dpmedia/auth/schema";
import { app } from "../src/index";
// Digest of this fixture's public test password; no production credentials.
const password = "legacy migration password";
const digest = "$2b$10$S4lMFZIDRZDWfAYVauu5OO/K26A81xHqZNKNWNc5AbjVzwv1WroQq";
describe("Clerk credential migration", () => {
  beforeAll(async () => {
    const db = createIdentityDatabase(env.AUTH_DB);
    await db.insert(user).values([
      {
        id: "user_clerk_original",
        email: "legacy@example.test",
        name: "Legacy User",
        emailVerified: true,
      },
      {
        id: "user_clerk_disabled",
        email: "disabled@example.test",
        name: "Disabled",
        emailVerified: true,
        disabled: true,
      },
    ]);
    await db.insert(account).values(
      ["user_clerk_original", "user_clerk_disabled"].map((id) => ({
        id: `credential-${id}`,
        accountId: id,
        userId: id,
        providerId: "credential",
        password: digest,
      })),
    );
    await db
      .insert(membership)
      .values({ userId: "user_clerk_original", app: "arts", role: "artmaker" });
  });
  async function signIn(email: string, suppliedPassword = password) {
    return app.request(
      "http://localhost:3000/api/auth/sign-in/email",
      {
        method: "POST",
        headers: { "content-type": "application/json", origin: "http://localhost:3001" },
        body: JSON.stringify({ email, password: suppliedPassword }),
      },
      env,
    );
  }
  it("accepts an imported bcrypt digest and preserves the Clerk id", async () => {
    const response = await signIn("legacy@example.test");
    expect(response.status).toBe(200);
    const data = (await response.json()) as { user: { id: string } };
    expect(data.user.id).toBe("user_clerk_original");
    expect(response.headers.getSetCookie().length).toBeGreaterThan(0);
  });
  it("rejects an incorrect legacy password", async () => {
    expect((await signIn("legacy@example.test", "wrong password")).status).toBe(401);
  });
  it("keeps disabled accounts disabled after migration", async () => {
    expect((await signIn("disabled@example.test")).status).toBe(403);
  });
  it("does not turn an arts role into music privileges", async () => {
    const login = await signIn("legacy@example.test");
    const cookie = login.headers
      .getSetCookie()
      .map((v) => v.split(";")[0])
      .join("; ");
    const response = await app.request(
      "http://localhost:3000/music/pages/admin/posts",
      { headers: { cookie } },
      env,
    );
    expect(response.status).toBe(403);
  });
  it("lets an unclaimed existing administrator sign in by verified code with both roles and the original ID", async () => {
    const email = "reserved-admin@example.test";
    const id = "wp_placeholder:reserved-admin";
    const plan = planClerkImport("id,primary_email_address\n", [], ["arts", "music"], {}, [
      {
        id,
        email,
        name: "Existing administrator",
        createdAt: 1,
        updatedAt: 1,
        memberships: { arts: ["super_admin"], music: ["super_admin"] },
      },
    ]);
    await env.AUTH_DB.exec(plan.sql);
    let code = "";
    const bindings = {
      ...env,
      EMAIL: {
        send: async (mail: { text?: string }) => {
          code = mail.text?.match(/\b\d{6}\b/)?.[0] || "";
        },
      },
    } as unknown as typeof env;
    const post = (path: string, body: unknown) =>
      app.request(
        `http://localhost:3000/api/auth/${path}`,
        {
          method: "POST",
          headers: { origin: "http://localhost:3001", "content-type": "application/json" },
          body: JSON.stringify(body),
        },
        bindings,
      );
    expect((await post("sign-in/email", { email, password: "no-invented-password" })).status).toBe(
      401,
    );
    expect((await post("sign-in/email-otp", { email, otp: "0000000" })).status).toBe(400);
    expect((await post("email-otp/send-verification-otp", { email, type: "sign-in" })).status).toBe(
      200,
    );
    const login = await post("sign-in/email-otp", { email, otp: code });
    expect(login.status).toBe(200);
    const identity = (await login.json()) as { user: { id: string; emailVerified: boolean } };
    expect(identity.user).toMatchObject({ id, emailVerified: true });
    const cookie = login.headers
      .getSetCookie()
      .map((value) => value.split(";")[0])
      .join("; ");
    for (const path of ["/arts/admin/overview", "/music/pages/admin"]) {
      expect(
        (await app.request(`http://localhost:3000${path}`, { headers: { cookie } }, bindings))
          .status,
      ).toBe(200);
    }
    expect(
      (
        await env.AUTH_DB.prepare("SELECT count(*) count FROM auth_account WHERE user_id=?")
          .bind(id)
          .first<{ count: number }>()
      )?.count,
    ).toBe(0);
  });
});
