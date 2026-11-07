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

/**
 * Known route renames from the Next.js app's /api namespace to the platform
 * API worker (apps/api). Everything else maps /api/X -> /music/X.
 */
const API_PATH_RENAMES: Record<string, string> = {
  // web's /api/music/* is the music-releases resource; the API router
  // serves it at /music/releases/*.
  "/api/music": "/music/releases",
};

/** Remap an internal /api path to the external API worker, when configured. */
export function resolveApiPath(path: string): string {
  const base = apiBaseUrl();
  if (!base || !path.startsWith("/api/")) {
    return path;
  }
  const normalized = base.replace(/\/$/, "");
  const queryIndex = path.indexOf("?");
  const pathname = queryIndex === -1 ? path : path.slice(0, queryIndex);
  const query = queryIndex === -1 ? "" : path.slice(queryIndex);

  const renamedKey = Object.keys(API_PATH_RENAMES).find(
    (key) => pathname === key || pathname.startsWith(`${key}/`),
  );
  if (renamedKey) {
    const target = API_PATH_RENAMES[renamedKey] as string;
    return `${normalized}${target}${pathname.slice(renamedKey.length)}${query}`;
  }
  return `${normalized}/music/${pathname.slice("/api/".length)}${query}`;
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
