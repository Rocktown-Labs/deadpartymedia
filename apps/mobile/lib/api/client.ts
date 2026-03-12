import { env } from "@dpmedia/env/native";
import { useAuth } from "@clerk/clerk-expo";
import * as React from "react";

const DEFAULT_API_BASE_URL = "http://localhost:3001";

export class ApiError extends Error {
  status: number;
  details: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

export function buildApiUrl(path: string) {
  const normalizedBase = (env.EXPO_PUBLIC_API_URL ?? DEFAULT_API_BASE_URL).replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

async function request<T>({
  body,
  headers,
  method = "GET",
  path,
  signal,
  token,
}: {
  body?: BodyInit | Record<string, unknown> | null;
  headers?: Record<string, string>;
  method?: "DELETE" | "GET" | "PATCH" | "POST";
  path: string;
  signal?: AbortSignal;
  token?: string | null;
}): Promise<T> {
  const requestHeaders: Record<string, string> = {
    Accept: "application/json",
    ...headers,
  };

  let payload: BodyInit | undefined;
  if (body instanceof FormData) {
    payload = body;
  } else if (body && typeof body === "object") {
    requestHeaders["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  } else if (typeof body === "string") {
    payload = body;
  }

  if (token) {
    requestHeaders.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(buildApiUrl(path), {
    body: payload,
    headers: requestHeaders,
    method,
    signal,
  });

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => null);
    const message =
      typeof errorPayload?.error === "string"
        ? errorPayload.error
        : typeof errorPayload?.message === "string"
          ? errorPayload.message
          : `Request failed with status ${response.status}`;

    throw new ApiError(message, response.status, errorPayload);
  }

  return response.json() as Promise<T>;
}

export function useApiClient() {
  const { getToken } = useAuth();

  const authedRequest = React.useCallback(
    async <T>(args: Omit<Parameters<typeof request<T>>[0], "token">) => {
      const token = await getToken();
      return request<T>({
        ...args,
        token,
      });
    },
    [getToken],
  );

  const publicRequest = React.useCallback(
    async <T>(args: Omit<Parameters<typeof request<T>>[0], "token">) => request<T>(args),
    [],
  );

  return {
    authedDelete: <T>(path: string, signal?: AbortSignal) =>
      authedRequest<T>({ method: "DELETE", path, signal }),
    authedGet: <T>(path: string, signal?: AbortSignal) => authedRequest<T>({ path, signal }),
    authedPatch: <T>(
      path: string,
      body?: BodyInit | FormData | Record<string, unknown> | null,
      signal?: AbortSignal,
    ) => authedRequest<T>({ body, method: "PATCH", path, signal }),
    authedPost: <T>(
      path: string,
      body?: BodyInit | FormData | Record<string, unknown> | null,
      signal?: AbortSignal,
    ) => authedRequest<T>({ body, method: "POST", path, signal }),
    publicDelete: <T>(path: string, signal?: AbortSignal) =>
      publicRequest<T>({ method: "DELETE", path, signal }),
    publicGet: <T>(path: string, signal?: AbortSignal) => publicRequest<T>({ path, signal }),
    publicPatch: <T>(
      path: string,
      body?: BodyInit | FormData | Record<string, unknown> | null,
      signal?: AbortSignal,
    ) => publicRequest<T>({ body, method: "PATCH", path, signal }),
    publicPost: <T>(
      path: string,
      body?: BodyInit | FormData | Record<string, unknown> | null,
      signal?: AbortSignal,
    ) => publicRequest<T>({ body, method: "POST", path, signal }),
  };
}
