import { createFileRoute } from "@tanstack/react-router";
import { env } from "cloudflare:workers";

async function proxyApi({ request }: { request: Request }) {
  const url = new URL(request.url);
  const path = url.pathname.startsWith("/api/auth/")
    ? url.pathname
    : url.pathname.replace(/^\/api/, "");
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
