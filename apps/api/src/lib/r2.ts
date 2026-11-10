import type { Bindings } from "../bindings";
export const r2Configured = (_env: Bindings) => true;
export async function r2Put(
  env: Bindings,
  key: string,
  body: ArrayBuffer | ReadableStream,
  contentType: string,
) {
  await env.MUSIC_MEDIA.put(key, body, { httpMetadata: { contentType } });
  const base = env.MUSIC_MEDIA_URL || `${env.WEB_APP_URL}/api/media`;
  return `${base.replace(/\/$/, "")}/${key.split("/").map(encodeURIComponent).join("/")}`;
}
