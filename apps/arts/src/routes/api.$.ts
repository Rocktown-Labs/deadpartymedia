import { createFileRoute } from "@tanstack/react-router";
import { env } from "cloudflare:workers";

const MAX_PROXY_BODY_BYTES = 16 * 1024 * 1024;

async function readBoundedBody(request: Request, maxBytes: number): Promise<ArrayBuffer | null> {
  if (!request.body) return new ArrayBuffer(0);
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return merged.buffer;
}

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
  let body: BodyInit | undefined;
  if (hasBody) {
    const contentLength = Number(request.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > MAX_PROXY_BODY_BYTES) {
      return Response.json({ error: "Payload too large" }, { status: 413 });
    }
    const buffered = await readBoundedBody(request, MAX_PROXY_BODY_BYTES);
    if (!buffered) {
      return Response.json({ error: "Payload too large" }, { status: 413 });
    }
    body = buffered.byteLength > 0 ? buffered : undefined;
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
