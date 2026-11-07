/**
 * Phase 1 flip (MIGRATION_PLAN.md): when API_BASE_URL is configured, arts
 * server functions proxy to the platform API worker (apps/api) instead of
 * querying the database directly. Unset (default) = current behavior.
 *
 * Auth: the incoming request's `__session` cookie / Authorization header are
 * forwarded verbatim — the API verifies them with the same Clerk instance.
 *
 * `@tanstack/react-start/server` is imported lazily: its subpath imports
 * only resolve under the tanstackStart() plugin, which vite-plus disables
 * under VITEST — a static import here breaks test files that import
 * .functions.ts modules unmocked (see venues.functions.ts vs the rest).
 */

type RequestHeadersLike = { get(name: string): string | null };

async function currentRequestHeaders(): Promise<RequestHeadersLike | null> {
  try {
    const { getRequestHeaders } = await import("@tanstack/react-start/server");
    return await getRequestHeaders();
  } catch {
    // No request context (e.g. direct invocation) — proceed unauthenticated.
    return null;
  }
}

export function artsApiConfigured(): boolean {
  return Boolean(process.env.API_BASE_URL);
}

function apiBase(): string {
  const base = process.env.API_BASE_URL;
  if (!base) {
    throw new Error("API_BASE_URL is not configured");
  }
  return base.replace(/\/$/, "");
}

export interface ArtsApiFetchInit {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  json?: unknown;
}

export async function artsApiFetch(path: string, init: ArtsApiFetchInit = {}): Promise<Response> {
  const headers = new Headers();
  if (init.json !== undefined) {
    headers.set("content-type", "application/json");
  }

  const requestHeaders = await currentRequestHeaders();
  if (requestHeaders) {
    const authorization = requestHeaders.get("authorization");
    if (authorization) {
      headers.set("authorization", authorization);
    }
    const cookie = requestHeaders.get("cookie");
    if (cookie) {
      headers.set("cookie", cookie);
    }
  }

  return fetch(`${apiBase()}${path}`, {
    body: init.json !== undefined ? JSON.stringify(init.json) : undefined,
    headers,
    method: init.method ?? "GET",
  });
}
