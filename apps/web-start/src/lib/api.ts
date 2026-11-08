/**
 * Platform API client for web-start.
 *
 * NOTE: Hono RPC (hc<AppType>) is the target DX — it gives type-safe
 * calls with inferred response shapes, zero hand-rolled interfaces.
 * It requires the API package to produce .d.ts files (declaration
 * generation), which wrangler's esbuild doesn't do by default.
 *
 * TODO(phase-4): Once apps/api builds with tsc --declaration, switch
 * all calls to the hc<AppType> client and delete the manual interfaces.
 */

const API_URL = process.env.API_URL ?? "http://localhost:8787";

export const apiUrl = (): string => API_URL.replace(/\/$/, "");

export async function apiFetch<T>(path: string): Promise<T> {
  const response = await fetch(`${apiUrl()}${path}`, {
    headers: { "content-type": "application/json" },
    method: "GET",
  });
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${path}`);
  }
  return (await response.json()) as T;
}
