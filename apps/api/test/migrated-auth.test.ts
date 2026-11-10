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
});
