import { describe, expect, it } from "vitest";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { createAuth } from "../src";

/**
 * The pool points at a non-existent local database but pg Pool is lazy —
 * nothing connects at construction time. This only proves the factory
 * wires up (bcrypt password config + drizzle adapter + admin plugin)
 * without throwing; real queries happen in Phase 4.
 */
function makeAuth() {
  const pool = new Pool({
    connectionString: "postgres://postgres:postgres@localhost:5432/none",
  });
  const database = drizzle(pool);
  return createAuth({
    database,
    secret: "test-secret-test-secret-test-secret-32",
    baseURL: "https://auth.deadpartymedia.com",
    trustedOrigins: ["https://deadpartymedia.com", "https://deadpartyarts.com"],
  });
}

describe("better-auth factory", () => {
  it("constructs the Dead Party ID auth instance", () => {
    const auth = makeAuth();
    expect(auth).toBeDefined();
    expect(auth.api).toBeDefined();
  });

  it("exposes email/password endpoints", () => {
    const auth = makeAuth();
    expect(typeof auth.api.signInEmail).toBe("function");
    expect(typeof auth.api.signUpEmail).toBe("function");
  });
});
