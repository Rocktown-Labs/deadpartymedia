/**
 * Browser-side API client for the platform API worker. Clerk session tokens
 * are attached as Bearer headers for authenticated calls (same pattern as
 * apps/web's lib/api/base.ts flip).
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

async function request<T>(
  path: string,
  method: "GET" | "POST" | "PATCH" | "DELETE",
  body?: unknown,
): Promise<ApiResult<T>> {
  const headers = new Headers(body !== undefined ? { "content-type": "application/json" } : {});
  try {
    const token = await clerkSession()?.getToken();
    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    }
  } catch {
    // Clerk not ready — the API will 401 and the caller surfaces it.
  }

  try {
    const response = await fetch(`${API_URL.replace(/\/$/, "")}${path}`, {
      body: body !== undefined ? JSON.stringify(body) : undefined,
      headers,
      method,
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

export async function apiGet<T = unknown>(path: string): Promise<ApiResult<T>> {
  return request<T>(path, "GET");
}

export async function apiPost<T = unknown>(path: string, body: unknown): Promise<ApiResult<T>> {
  return request<T>(path, "POST", body);
}

export async function apiPatch<T = unknown>(path: string, body: unknown): Promise<ApiResult<T>> {
  return request<T>(path, "PATCH", body);
}

export async function apiDelete<T = unknown>(path: string, body: unknown): Promise<ApiResult<T>> {
  return request<T>(path, "DELETE", body);
}

/** Cart id cookie helpers — mirrors the Next app's `dead-party-cart-id`. */
const CART_COOKIE = "dead-party-cart-id";

export function getCartId(): string | null {
  if (typeof document === "undefined") {
    return null;
  }
  const match = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${CART_COOKIE}=`));
  return match ? decodeURIComponent(match.slice(CART_COOKIE.length + 1)) : null;
}

export function setCartId(cartId: string): void {
  if (typeof document === "undefined") {
    return;
  }
  document.cookie = `${CART_COOKIE}=${encodeURIComponent(cartId)}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`;
}
