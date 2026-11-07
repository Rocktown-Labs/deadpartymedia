/**
 * Client-side API fetch wrapper (Phase 1 flip — MIGRATION_PLAN.md).
 *
 * NEXT_PUBLIC_API_URL unset (default): identical to plain fetch() against
 * this app's own /api routes — zero behavior change.
 *
 * NEXT_PUBLIC_API_URL set: /api/* requests are remapped to the platform
 * API worker (/music/*) with a Clerk session token attached for
 * authenticated calls (third-party cookies can't cross origins, so we
 * send an explicit Bearer token instead).
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

function apiBaseUrl(): string | undefined {
  // Read lazily so runtime env changes (tests, preview toggles) are honored.
  return API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || undefined;
}

export function isExternalApi(): boolean {
  return Boolean(apiBaseUrl());
}

/** Remap an internal /api path to the external API worker, when configured. */
export function resolveApiPath(path: string): string {
  const base = apiBaseUrl();
  if (!base || !path.startsWith("/api/")) {
    return path;
  }
  const normalized = base.replace(/\/$/, "");
  return `${normalized}/music/${path.slice("/api/".length)}`;
}

type ClerkJsSession = { getToken: () => Promise<string | null> } | null | undefined;

function clerkSession(): ClerkJsSession {
  if (typeof window === "undefined") {
    return undefined;
  }
  const clerk = (window as unknown as { Clerk?: { session?: ClerkJsSession } }).Clerk;
  return clerk?.session;
}

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const resolved = resolveApiPath(path);
  if (resolved === path) {
    return fetch(path, init);
  }

  const headers = new Headers(init?.headers);
  try {
    // ClerkJS loads asynchronously; if it is not ready yet the request
    // simply proceeds unauthenticated (same as the app's own routes).
    const token = await clerkSession()?.getToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  } catch {
    // No Clerk session — proceed unauthenticated.
  }

  return fetch(resolved, { ...init, headers });
}
