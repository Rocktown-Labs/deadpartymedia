import { createFileRoute } from "@tanstack/react-router";
import { env } from "cloudflare:workers";
async function proxyApi({ request }: { request: Request }) {
  const url = new URL(request.url);
  let path = url.pathname;
  if (path.startsWith("/api/rpc/music/")) path = path.replace("/api/rpc/music", "/music");
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
  const proxied = new Request(url, request);
  proxied.headers.set("x-deadparty-origin", new URL(request.url).origin);
  return env.API.fetch(proxied);
}
export const Route = createFileRoute("/api/$")({
  server: {
    handlers: {
      GET: proxyApi,
      POST: proxyApi,
      PUT: proxyApi,
      PATCH: proxyApi,
      DELETE: proxyApi,
      OPTIONS: proxyApi,
    },
  },
});
