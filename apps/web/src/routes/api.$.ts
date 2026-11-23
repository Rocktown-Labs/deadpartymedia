import { createFileRoute } from "@tanstack/react-router";
import { env } from "cloudflare:workers";
const MAX_PROXY_BODY_BYTES = 16 * 1024 * 1024;

async function proxyApi({ request }: { request: Request }) {
  const incomingUrl = new URL(request.url);
  const url = new URL(request.url);
  let path = url.pathname;
  if (path.startsWith("/api/sso/")) path = path.replace("/api/sso", "/sso");
  else if (path.startsWith("/api/rpc/music/")) path = path.replace("/api/rpc/music", "/music");
  else if (path.startsWith("/api/auth/") && path !== "/api/auth/me") {
    /* Better Auth has its own handler. */
  } else {
    path = path.replace(/^\/api/, "/music");
    if (path === "/music/music" || path.startsWith("/music/music/"))
      path = path.replace("/music/music", "/music/releases");
    if (path === "/music/upload/image") path = "/music/upload";
  }
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
