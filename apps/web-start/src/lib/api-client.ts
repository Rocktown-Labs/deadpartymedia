/**
 * Browser-side API client for authenticated mutations against the platform
 * API worker. Clerk session tokens are attached as Bearer headers — same
 * pattern as apps/web's lib/api/base.ts flip.
 */
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8787";

type ClerkJsSession = { getToken: () => Promise<string | null> } | null | undefined;

function clerkSession(): ClerkJsSession {
  if (typeof window === "undefined") {
    return undefined;
  }
  const clerk = (window as unknown as { Clerk?: { session?: ClerkJsSession } }).Clerk;
  return clerk?.session;
}

export interface ApiResult<T = unknown> {
  data?: T;
  error?: string;
  ok: boolean;
}

export async function apiPost<T = unknown>(path: string, body: unknown): Promise<ApiResult<T>> {
  const headers = new Headers({ "content-type": "application/json" });
  try {
    const token = await clerkSession()?.getToken();
    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    }
  } catch {
    // Clerk not ready — the API will 401 and the form surfaces it.
  }

  try {
    const response = await fetch(`${API_URL.replace(/\/$/, "")}${path}`, {
      body: JSON.stringify(body),
      headers,
      method: "POST",
    });
    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) {
      return {
        error:
          typeof payload.error === "string" ? payload.error : `Request failed (${response.status})`,
        ok: false,
      };
    }
    return { data: payload as T, ok: true };
  } catch {
    return { error: "Could not reach the API. Is it running?", ok: false };
  }
}
