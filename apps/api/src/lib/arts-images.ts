import type { Bindings } from "../bindings";

/**
 * Arts image URL helpers, ported from apps/arts/src/lib/upload.ts with the
 * env passed explicitly (no process.env/Vite env in a Worker).
 */

/** Build the public R2 URL for an uploaded object key. */
export function getPublicUploadUrl(env: Bindings, objectKey: string) {
  const publicBaseUrl = env.CLOUDFLARE_R2_PUBLIC_URL?.replace(/\/$/, "");

  if (!publicBaseUrl) {
    return objectKey;
  }

  return `${publicBaseUrl}/${objectKey.replace(/^\//, "")}`;
}

// Images saved before CLOUDFLARE_R2_PUBLIC_URL was configured point at the
// private S3 endpoint, which requires authorization and can never render in
// a browser. The files themselves are intact in the bucket.
const LEGACY_S3_HOST_PATTERN = /r2\.cloudflarestorage\.com/;

/**
 * Rewrite legacy image URLs saved with the private S3 endpoint to the
 * current public base URL. Applied at the data layer so existing rows
 * self-heal once the public URL is configured — no re-upload or data
 * migration needed.
 */
export function normalizeStoredImageUrl(env: Bindings, url: string | null | undefined): string {
  if (!url || !LEGACY_S3_HOST_PATTERN.test(url)) {
    return url ?? "";
  }

  const key = url.replace(/^[a-z]+:\/\/[^/]+\//, "");
  return getPublicUploadUrl(env, key);
}
