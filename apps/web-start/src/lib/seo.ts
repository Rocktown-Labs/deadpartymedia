/**
 * Ported from apps/web/src/lib/seo.ts — metadata helpers for route head().
 * Canonical URLs keep the production site origin; dynamic OG images are
 * rendered by the platform API worker (GET /music/og/:type/:slug).
 */
const SITE_URL = "https://www.deadpartymedia.com";
const SITE_NAME = "Dead Party Media";
const DEFAULT_DESCRIPTION =
  "Your #1 digital outlet for Arkansas music and live events. We cover artists across all genres, host events, and deliver exclusive content and interviews.";
const DEFAULT_OG_IMAGE = `${SITE_URL}/images/dead-party-logo-og.jpg`;

export function getAbsoluteUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  return `${SITE_URL}/${cleanPath}`;
}

export function stripHtml(html: string | null | undefined): string {
  if (!html) {
    return "";
  }
  const text = html.replaceAll(/<[^>]*>/g, "");
  return text
    .replaceAll("&nbsp;", " ")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&apos;", "'")
    .trim();
}

export function truncateText(text: string, maxLength = 160): string {
  if (!text || text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength - 3).trim()}...`;
}

export function sanitizeDescription(
  description: string | null | undefined,
  fallback: string = DEFAULT_DESCRIPTION,
  maxLength = 160,
): string {
  if (!description) {
    return fallback;
  }
  const cleaned = stripHtml(description);
  if (!cleaned) {
    return fallback;
  }
  return truncateText(cleaned, maxLength);
}

export function getSiteDefaults() {
  return {
    defaultDescription: DEFAULT_DESCRIPTION,
    defaultOgImage: DEFAULT_OG_IMAGE,
    siteName: SITE_NAME,
    siteUrl: SITE_URL,
  };
}

interface HeadMeta {
  title: string;
  description: string;
  canonical: string;
  ogTitle: string;
  ogDescription: string;
  ogType: "article" | "profile" | "website";
  ogImage: string;
  ogFallbackImage?: string;
  ogUrl: string;
}

/** Convert the shared metadata shape into TanStack head() parts. */
export function toHeadParts(meta: HeadMeta) {
  const images = [
    { content: meta.ogImage, property: "og:image" },
    ...(meta.ogFallbackImage && meta.ogFallbackImage !== meta.ogImage
      ? [{ content: meta.ogFallbackImage, property: "og:image" }]
      : []),
  ];
  return {
    links: [{ href: meta.canonical, rel: "canonical" }],
    meta: [
      { content: meta.description, name: "description" },
      { content: meta.ogTitle, property: "og:title" },
      { content: meta.ogDescription, property: "og:description" },
      { content: meta.ogType, property: "og:type" },
      { content: meta.ogUrl, property: "og:url" },
      { content: SITE_NAME, property: "og:site_name" },
      ...images,
      { content: "summary_large_image", name: "twitter:card" },
      { content: meta.ogTitle, name: "twitter:title" },
      { content: meta.ogDescription, name: "twitter:description" },
      { content: meta.ogImage, name: "twitter:image" },
      { title: `${meta.title} | ${SITE_NAME}` },
    ],
  };
}

/** Dynamic OG image served by the API worker. */
export function getOgImageUrl(
  apiUrl: string,
  type: "article" | "event" | "artist",
  slug: string,
): string {
  return `${apiUrl}/music/og/${type}/${slug}`;
}
