import type { Metadata } from "next";
import type { Article } from "./api/articles";
import type { Event } from "./api/events";
import type { Artist } from "./api/artists";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.deadpartymedia.com";
const DEFAULT_OG_IMAGE = `${SITE_URL}/images/dead-party-logo-og.jpg`;

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

  // Handle Django media URLs (e.g., /media/articles/image.jpg)
  if (imagePath.startsWith("/media/")) {
    // Check if we have a media base URL configured
    const mediaBaseUrl = process.env.NEXT_PUBLIC_MEDIA_URL;
    if (mediaBaseUrl) {
      // Remove trailing slash from base URL and leading slash from path
      const base = mediaBaseUrl.replace(/\/$/, "");
      const path = imagePath.startsWith("/") ? imagePath : `/${imagePath}`;
      return `${base}${path}`;
    }

    // If API_URL is set and includes the domain, use it
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (apiUrl && (apiUrl.startsWith("http://") || apiUrl.startsWith("https://"))) {
      // Extract base URL from API URL (remove /api suffix)
      const apiBase = apiUrl.replace(/\/api\/?$/, "");
      return `${apiBase}${imagePath}`;
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
  const title = `${article.title} | Dead Party Media`;
  const description = article.excerpt || `Read about ${article.title} on Dead Party Media`;
  const image = getImageUrl(article.cover_image);
  const url = getAbsoluteUrl(`/article/${article.slug}`);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: "Dead Party Media",
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: article.title,
        },
      ],
      locale: "en_US",
      type: "article",
      publishedTime: article.published_at || undefined,
      authors: [article.author.name],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
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
  const title = `${event.title} | Dead Party Media`;
  const description =
    event.description || `${event.title} - ${event.venue}, ${event.location} on ${new Date(event.date).toLocaleDateString()}`;
  const image = getImageUrl(event.image);
  const url = getAbsoluteUrl(`/events/${event.slug}`);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: "Dead Party Media",
      images: [
        {
          url: image,
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
      images: [image],
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
  const title = `${artist.name} | Dead Party Media`;
  const description = artist.bio || `Learn more about ${artist.name} on Dead Party Media`;
  const image = getImageUrl(artist.image);
  const url = getAbsoluteUrl(`/artists/${artist.slug}`);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: "Dead Party Media",
      images: [
        {
          url: image,
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
      images: [image],
    },
    alternates: {
      canonical: url,
    },
  };
}

