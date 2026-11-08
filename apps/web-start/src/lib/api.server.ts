import { apiUrl } from "./api";

type RequestHeadersLike = { get(name: string): string | null };

/**
 * Authenticated server-side fetch — forwards the incoming request's
 * `__session` cookie / Authorization header to the API worker. Server-only
 * (kept in a .server.ts file to satisfy TanStack Start's import protection).
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
