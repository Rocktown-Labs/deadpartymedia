import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
import { describe, expect, it } from "vite-plus/test";

/**
 * Read-only smoke test against the real Neon database.
 *
 * Runs only when a usable DATABASE_URL is available (locally via
 * apps/api/.dev.vars, which is gitignored). If credentials are rejected
 * the tests self-skip with the reason — they never fail a normal
 * `pnpm test` run, and they never write.
 */
function loadDevVars(): void {
  if (process.env.DATABASE_URL) {
    return;
  }
  try {
    const file = readFileSync(new URL("../.dev.vars", import.meta.url), "utf8");
    for (const line of file.split("\n")) {
      const match = /^([A-Z_0-9]+)=(.*)$/.exec(line.trim());
      if (match?.[1]) {
        process.env[match[1]] ??= match[2] ?? "";
      }
    }
  } catch {
    // No .dev.vars — smoke test skips.
  }
}

loadDevVars();

const hasDatabase = Boolean(process.env.DATABASE_URL);

/** Probes connectivity once; caches the failure reason for skip messages. */
let connectionProblem: string | null | undefined;
async function connectionWorks(): Promise<string | null> {
  if (connectionProblem !== undefined) {
    return connectionProblem;
  }
  try {
    const sql = neon(process.env.DATABASE_URL as string);
    await sql`select 1`;
    connectionProblem = null;
  } catch (error) {
    connectionProblem = error instanceof Error ? error.message : String(error);
  }
  return connectionProblem;
}

describe.skipIf(!hasDatabase)("Neon read-only smoke", () => {
  it("healthz reports db up", async (context) => {
    const problem = await connectionWorks();
    if (problem) {
      console.warn(`[smoke] skipping — DATABASE_URL rejected: ${problem}`);
      context.skip();
    }
    const { app } = await import("../src/index");
    const response = await app.request("/healthz", {}, process.env as never);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ db: "up", status: "ok" });
  });

  it("GET /music/venues returns the venue directory", async (context) => {
    const problem = await connectionWorks();
    if (problem) {
      console.warn(`[smoke] skipping — DATABASE_URL rejected: ${problem}`);
      context.skip();
    }
    const { app } = await import("../src/index");
    const response = await app.request("/music/venues", {}, process.env as never);
    expect(response.status).toBe(200);
    const body = (await response.json()) as unknown;
    expect(Array.isArray(body)).toBe(true);
  });
});
