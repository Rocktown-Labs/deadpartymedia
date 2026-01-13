import type { Metadata } from "next";
import type { Article } from "./api/articles";
import type { Event } from "./api/events";
import type { Artist } from "./api/artists";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.deadpartymedia.com";
const DEFAULT_OG_IMAGE = `${SITE_URL}/images/dead-party-logo-og.jpg`;
const SITE_NAME = "Dead Party Media";
const DEFAULT_DESCRIPTION =
  "Your #1 digital outlet for Arkansas music and live events. We cover artists across all genres, host events, and deliver exclusive content and interviews.";

/**
 * Convert a relative path to an absolute URL
 */
export function getAbsoluteUrl(path: string): string {
  // If already absolute, return as-is
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  // Remove leading slash if present to avoid double slashes
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  return `${SITE_URL}/${cleanPath}`;
}

/**
 * Strip HTML tags and decode HTML entities from a string
 */
export function stripHtml(html: string | null | undefined): string {
  if (!html) return "";
  // Remove HTML tags
  const text = html.replace(/<[^>]*>/g, "");
  // Decode common HTML entities
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .trim();
}

/**
 * Truncate text to a maximum length, adding ellipsis if truncated
 */
export function truncateText(text: string, maxLength: number = 160): string {
  if (!text || text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3).trim() + "...";
}

/**
 * Sanitize and truncate description text from HTML or plain text
 */
export function sanitizeDescription(
  description: string | null | undefined,
  fallback: string = DEFAULT_DESCRIPTION,
  maxLength: number = 160
): string {
  if (!description) return fallback;
  const cleaned = stripHtml(description);
  if (!cleaned) return fallback;
  return truncateText(cleaned, maxLength);
}

/**
 * Get the OG image URL for a specific type and slug (for dynamic OG images)
 */
export function getOgImageUrl(type: "article" | "event" | "artist", slug: string): string {
  return getAbsoluteUrl(`/api/og/${type}/${slug}`);
}

/**
 * Get site defaults for metadata
 */
export function getSiteDefaults() {
  return {
    siteUrl: SITE_URL,
    siteName: SITE_NAME,
    defaultDescription: DEFAULT_DESCRIPTION,
    defaultOgImage: DEFAULT_OG_IMAGE,
  };
}

/**
 * Convert an image path to an absolute URL
 * Handles Django media URLs and relative paths
 */
export function getImageUrl(imagePath: string | null | undefined): string {
  if (!imagePath) {
    return DEFAULT_OG_IMAGE;
  }

  // If already absolute, return as-is
  if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
    return imagePath;
  }

  // Handle media URLs (e.g., /media/articles/image.jpg)
  if (imagePath.startsWith("/media/")) {
    // Check if we have a media base URL configured
    const mediaBaseUrl = process.env.NEXT_PUBLIC_MEDIA_URL;
    if (mediaBaseUrl) {
      // Remove trailing slash from base URL and leading slash from path
      const base = mediaBaseUrl.replace(/\/$/, "");
      const path = imagePath.startsWith("/") ? imagePath : `/${imagePath}`;
      return `${base}${path}`;
    }

    // Fallback: assume media is served from the same domain as the site
    return getAbsoluteUrl(imagePath);
  }

  // Handle relative paths from public folder
  if (imagePath.startsWith("/")) {
    return getAbsoluteUrl(imagePath);
  }

  // Default: treat as relative path
  return getAbsoluteUrl(imagePath);
}

/**
 * Generate metadata for an article
 */
export function generateArticleMetadata(article: Article): Metadata {
  const title = `${article.title} | ${SITE_NAME}`;
  const description = sanitizeDescription(
    article.excerpt,
    `Read about ${article.title} on ${SITE_NAME}`
  );
  // Use dynamic OG image, fallback to cover image or default
  const ogImageUrl = getOgImageUrl("article", article.slug);
  const fallbackImage = getImageUrl(article.cover_image);
  const url = getAbsoluteUrl(`/article/${article.slug}`);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: article.title,
        },
        {
          url: fallbackImage,
          width: 1200,
          height: 630,
          alt: article.title,
        },
      ],
      locale: "en_US",
      type: "article",
      publishedTime: article.published_at || undefined,
      authors: article.author?.name ? [article.author.name] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl, fallbackImage],
    },
    alternates: {
      canonical: url,
    },
  };
}

/**
 * Generate metadata for an event
 */
export function generateEventMetadata(event: Event): Metadata {
  const title = `${event.title} | ${SITE_NAME}`;
  const eventDate = event.date ? new Date(event.date).toLocaleDateString() : "";
  const fallbackDescription = `${event.title} - ${event.venue}, ${event.location}${eventDate ? ` on ${eventDate}` : ""}`;
  const description = sanitizeDescription(event.description, fallbackDescription);
  // Use dynamic OG image, fallback to event image or default
  const ogImageUrl = getOgImageUrl("event", event.slug);
  const fallbackImage = getImageUrl(event.image);
  const url = getAbsoluteUrl(`/events/${event.slug}`);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: event.title,
        },
        {
          url: fallbackImage,
          width: 1200,
          height: 630,
          alt: event.title,
        },
      ],
      locale: "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl, fallbackImage],
    },
    alternates: {
      canonical: url,
    },
  };
}

/**
 * Generate metadata for an artist
 */
export function generateArtistMetadata(artist: Artist): Metadata {
  const title = `${artist.name} | ${SITE_NAME}`;
  const description = sanitizeDescription(
    artist.bio,
    `Learn more about ${artist.name} on ${SITE_NAME}`
  );
  // Use dynamic OG image, fallback to artist image or default
  const ogImageUrl = getOgImageUrl("artist", artist.slug);
  const fallbackImage = getImageUrl(artist.image);
  const url = getAbsoluteUrl(`/artists/${artist.slug}`);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: artist.name,
        },
        {
          url: fallbackImage,
          width: 1200,
          height: 630,
          alt: artist.name,
        },
      ],
      locale: "en_US",
      type: "profile",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl, fallbackImage],
    },
    alternates: {
      canonical: url,
    },
  };
}
