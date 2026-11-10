import type { Bindings } from "../bindings";
type ImageConfig = Pick<Bindings, "WEB_APP_URL" | "MUSIC_MEDIA_URL">;

const DEFAULT_SITE_URL = "https://www.deadpartymedia.com";
const SITE_NAME = "Dead Party Media";
const DEFAULT_DESCRIPTION =
  "Your #1 digital outlet for Arkansas music and live events. We cover artists across all genres, host events, and deliver exclusive content and interviews.";

/** Mirrors `SITE_URL = process.env.WEB_APP_URL || "https://www.deadpartymedia.com"`. */
function getSiteUrl(env: ImageConfig): string {
  return env.WEB_APP_URL || DEFAULT_SITE_URL;
}

/**
 * Convert a relative path to an absolute URL (source: getAbsoluteUrl).
 */
export function getAbsoluteUrl(env: ImageConfig, path: string): string {
  // If already absolute, return as-is
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  // Remove leading slash if present to avoid double slashes
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  return `${getSiteUrl(env)}/${cleanPath}`;
}

/** Mirrors `DEFAULT_OG_IMAGE = ${SITE_URL}/images/dead-party-logo-og.jpg`. */
export function getDefaultOgImage(env: ImageConfig): string {
  return `${getSiteUrl(env)}/images/dead-party-logo-og.jpg`;
}

/**
 * Convert an image path to an absolute URL.
 * Handles Django media URLs and relative paths (source: getImageUrl).
 */
export function getImageUrl(env: ImageConfig, imagePath: string | null | undefined): string {
  if (!imagePath) {
    return getDefaultOgImage(env);
  }

  // If already absolute, return as-is
  if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
    return imagePath;
  }

  // Handle media URLs (e.g., /media/articles/image.jpg)
  if (imagePath.startsWith("/media/")) {
    // Check if we have a media base URL configured
    const mediaBaseUrl = env.MUSIC_MEDIA_URL;
    if (mediaBaseUrl) {
      // Remove trailing slash from base URL and leading slash from path
      const base = mediaBaseUrl.replace(/\/$/, "");
      const path = imagePath.startsWith("/") ? imagePath : `/${imagePath}`;
      return `${base}${path}`;
    }

    // Fallback: assume media is served from the same domain as the site
    return getAbsoluteUrl(env, imagePath);
  }

  // Handle relative paths from public folder and bare relative paths —
  // both branches of the source resolve through getAbsoluteUrl.
  return getAbsoluteUrl(env, imagePath);
}

/**
 * Get site defaults for metadata (source: getSiteDefaults).
 */
export function getSiteDefaults(env: ImageConfig) {
  return {
    defaultDescription: DEFAULT_DESCRIPTION,
    defaultOgImage: getDefaultOgImage(env),
    siteName: SITE_NAME,
    siteUrl: getSiteUrl(env),
  };
}
