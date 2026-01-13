import { NextResponse } from "next/server";
import { generateRequestId, withRequestContext } from "./context";
import { logger } from "../logger";

type RequestLike = {
  headers: Headers;
  nextUrl: { pathname: string };
  method: string;
};

/**
 * Add request ID to response headers for correlation
 */
export function addRequestIdHeader(response: NextResponse, requestId: string): void {
  response.headers.set("X-Request-ID", requestId);
}

/**
 * Get or create request ID from headers
 */
export function getRequestId(request: RequestLike): string {
  return request.headers.get("X-Request-ID") || generateRequestId();
}

/**
 * Create a logger instance scoped to the current request
 */
export function getRequestLogger(request: RequestLike): ReturnType<typeof withRequestContext> {
  const requestId = getRequestId(request);
  return withRequestContext(logger, requestId, {
    method: request.method,
    path: request.nextUrl.pathname,
  });
}
