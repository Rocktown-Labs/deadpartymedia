export function getPublicUploadUrl(objectKey: string) {
  const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
  const nodeEnv =
    typeof process === "undefined"
      ? undefined
      : (process.env as Record<string, string | undefined>);
  const publicBaseUrl = (
    viteEnv?.VITE_CLOUDFLARE_R2_PUBLIC_URL ??
    viteEnv?.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL ??
    nodeEnv?.CLOUDFLARE_R2_PUBLIC_URL
  )?.replace(/\/$/, "");

  if (!publicBaseUrl) {
    return objectKey;
  }

  return `${publicBaseUrl}/${objectKey.replace(/^\//, "")}`;
}

/**
 * Build a public URL for an uploaded object using the base URL the upload API
 * returns in its response metadata (sourced from the server runtime env).
 *
 * The server-provided base is the reliable path in production: client bundles
 * cannot read process.env, and build-time VITE_ inlining only works when the
 * variable is set during the Vercel build (issue #90).
 */
export function buildPublicUploadUrl(objectKey: string, metadata: unknown) {
  const publicBaseUrl = (metadata as { publicBaseUrl?: unknown } | undefined)?.publicBaseUrl;

  if (typeof publicBaseUrl === "string" && publicBaseUrl) {
    return `${publicBaseUrl.replace(/\/$/, "")}/${objectKey.replace(/^\//, "")}`;
  }

  return getPublicUploadUrl(objectKey);
}

export interface UploadFailureLike {
  name?: string;
  error?: { type?: string; message?: string };
}

// Images saved before CLOUDFLARE_R2_PUBLIC_URL was configured point at the
// private S3 endpoint, which requires authorization and can never render in a
// browser. The files themselves are intact in the bucket.
const LEGACY_S3_HOST_PATTERN = /r2\.cloudflarestorage\.com/;

/**
 * Rewrite legacy image URLs saved with the private S3 endpoint to the current
 * public base URL. Applied at the data layer so existing rows self-heal once
 * the public URL is configured — no re-upload or data migration needed.
 */
export function normalizeStoredImageUrl(url: string | null | undefined): string {
  if (!url || !LEGACY_S3_HOST_PATTERN.test(url)) {
    return url ?? "";
  }

  const key = url.replace(/^[a-z]+:\/\/[^/]+\//, "");
  return getPublicUploadUrl(key);
}

/**
 * Human-readable message for files that failed the direct storage transfer.
 * uploadFiles() resolves instead of throwing for these, so callers must check
 * failedFiles themselves and surface this message (issue #90).
 */
export function describeUploadFailures(failures: UploadFailureLike[]) {
  if (failures.length === 0) {
    return "";
  }

  const first = failures[0];
  const subject = failures.length === 1 ? "file" : "files";
  const label = first?.name ? ` (${first.name})` : "";
  const detail =
    first?.error?.type === "s3_upload"
      ? "The transfer to storage failed. Check your connection and try again."
      : first?.error?.message || "Please try again.";

  return `Couldn't upload ${failures.length} ${subject}${label}. ${detail}`;
}
