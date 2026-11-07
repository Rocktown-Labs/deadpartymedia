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

type RequestHeadersLike = { get(name: string): string | null };

/**
 * Authenticated server-side fetch: forwards the incoming request's
 * `__session` cookie / Authorization header to the API worker, which
 * verifies them with the same Clerk instance (same pattern as arts'
 * api-proxy). For loader use on authenticated pages.
 */
export async function apiFetchWithAuth<T>(path: string): Promise<T> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  try {
    const { getRequestHeaders } = await import("@tanstack/react-start/server");
    const requestHeaders: RequestHeadersLike = await getRequestHeaders();
    const authorization = requestHeaders.get("authorization");
    if (authorization) {
      headers.authorization = authorization;
    }
    const cookie = requestHeaders.get("cookie");
    if (cookie) {
      headers.cookie = cookie;
    }
  } catch {
    // No request context — proceed unauthenticated.
  }

  const response = await fetch(`${apiUrl()}${path}`, { headers, method: "GET" });
  if (response.status === 401) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), {
      headers: { "content-type": "application/json" },
      status: 401,
    });
  }
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${path}`);
  }
  return (await response.json()) as T;
}
