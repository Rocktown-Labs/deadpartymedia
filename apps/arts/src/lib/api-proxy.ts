import { getRequestHeaders } from "@tanstack/react-start/server";

/**
 * Phase 1 flip (MIGRATION_PLAN.md): when API_BASE_URL is configured, arts
 * server functions proxy to the platform API worker (apps/api) instead of
 * querying the database directly. Unset (default) = current behavior.
 *
 * Auth: the incoming request's `__session` cookie / Authorization header are
 * forwarded verbatim — the API verifies them with the same Clerk instance.
 */

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

  try {
    const requestHeaders = await getRequestHeaders();
    const authorization = requestHeaders.get("authorization");
    if (authorization) {
      headers.set("authorization", authorization);
    }
    const cookie = requestHeaders.get("cookie");
    if (cookie) {
      headers.set("cookie", cookie);
    }
  } catch {
    // No request context (e.g. direct invocation) — proceed unauthenticated.
  }

  return fetch(`${apiBase()}${path}`, {
    body: init.json !== undefined ? JSON.stringify(init.json) : undefined,
    headers,
    method: init.method ?? "GET",
  });
}
