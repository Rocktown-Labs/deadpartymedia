import { createFileRoute } from "@tanstack/react-router";
import { env } from "cloudflare:workers";

const MAX_PROXY_BODY_BYTES = 16 * 1024 * 1024;

async function proxyApi({ request }: { request: Request }) {
  const incomingUrl = new URL(request.url);
  const url = new URL(request.url);
  const path = url.pathname.startsWith("/api/auth/")
    ? url.pathname
    : url.pathname.replace(/^\/api/, "");
  url.protocol = "https:";
  url.host = "deadparty-api";
  url.pathname = path;
  const headers = new Headers(request.headers);
  headers.set("x-deadparty-origin", incomingUrl.origin);

  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  let body: ArrayBuffer | undefined;
  if (hasBody) {
    const contentLength = Number(request.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > MAX_PROXY_BODY_BYTES) {
      return Response.json({ error: "Payload too large" }, { status: 413 });
    }
    body = await request.arrayBuffer();
    if (body.byteLength > MAX_PROXY_BODY_BYTES) {
      return Response.json({ error: "Payload too large" }, { status: 413 });
    }
  }

  const proxied = new Request(url, {
    method: request.method,
    headers,
    ...(body ? { body } : {}),
    redirect: "manual",
  });
  return env.API.fetch(proxied);
}
export const Route = createFileRoute("/api/$")({
  server: {
    handlers: {
      GET: proxyApi,
      HEAD: proxyApi,
      POST: proxyApi,
      PUT: proxyApi,
      PATCH: proxyApi,
      DELETE: proxyApi,
      OPTIONS: proxyApi,
    },
  },
});
