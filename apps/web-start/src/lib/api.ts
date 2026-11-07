/**
 * Server-side client for the platform API worker (apps/api).
 *
 * Loaders run on the server for the initial request, so public API reads
 * need no auth plumbing here. API_URL defaults to the local wrangler dev
 * server; production sets it to the deployed worker origin.
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
