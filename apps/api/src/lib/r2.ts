import { AwsClient } from "aws4fetch";
import type { Bindings } from "../bindings";

/**
 * R2 object uploads via the S3-compatible API (aws4fetch), replacing the
 * web app's Vercel Blob usage. Arts already stores under R2 with the same
 * env var names, so uploads unify here in Phase 1.
 */

export function r2Configured(env: Bindings): boolean {
  return Boolean(
    env.CLOUDFLARE_R2_ACCOUNT_ID &&
      env.CLOUDFLARE_R2_ACCESS_KEY_ID &&
      env.CLOUDFLARE_R2_SECRET_ACCESS_KEY &&
      env.CLOUDFLARE_R2_BUCKET &&
      env.CLOUDFLARE_R2_PUBLIC_URL,
  );
}

export function r2PublicUrl(env: Bindings, key: string): string {
  return `${env.CLOUDFLARE_R2_PUBLIC_URL}/${key}`;
}

/**
 * PUT an object to R2. Returns its public URL.
 * Keys must be pre-validated (path prefix + extension) by the caller.
 */
export async function r2Put(
  env: Bindings,
  key: string,
  body: ArrayBuffer | Uint8Array | string,
  contentType: string,
): Promise<string> {
  if (!r2Configured(env)) {
    throw new Error("R2 storage is not configured");
  }

  const aws = new AwsClient({
    accessKeyId: env.CLOUDFLARE_R2_ACCESS_KEY_ID as string,
    secretAccessKey: env.CLOUDFLARE_R2_SECRET_ACCESS_KEY as string,
    service: "s3",
  });

  const url = new URL(
    `https://${env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${env.CLOUDFLARE_R2_BUCKET}/${key}`,
  );
  url.pathname = url.pathname
    .split("/")
    .map((segment, index) => (index === 0 ? segment : encodeURIComponent(segment)))
    .join("/");

  const response = await aws.fetch(url, {
    method: "PUT",
    body,
    headers: { "content-type": contentType },
  });

  if (!response.ok) {
    throw new Error(`R2 upload failed: ${response.status} ${await response.text()}`);
  }

  return r2PublicUrl(env, key);
}
