import type { Article } from "./articles";
import type { Event } from "./events";
import type { Artist } from "./artists";
import { headers } from "next/headers";
import { logger } from "@/lib/logger";
import { sanitizeError } from "@/lib/logger/sanitize";

const resolveServerBaseUrl = (): string => {
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) {
    return `https://${vercelUrl}`;
  }

  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (configuredSiteUrl) {
    return configuredSiteUrl;
  }

  return "http://localhost:3000";
};

const getRequestBaseUrl = async (): Promise<string> => {
  try {
    const requestHeaders = await headers();
    const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");

    if (!host) {
      return resolveServerBaseUrl();
    }

    const protocol =
      requestHeaders.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");

    return `${protocol}://${host}`;
  } catch {
    return resolveServerBaseUrl();
  }
};

const METADATA_REVALIDATE_SECONDS = 300;

/**
 * Server-side API client for fetching data from Next.js API routes.
 * Used for generating metadata in Next.js server components.
 */
const serverFetch = async <T>(endpoint: string): Promise<T> => {
  const baseUrl = await getRequestBaseUrl();
  const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const url = `${normalizedBaseUrl}${endpoint}`;

  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
    },
    method: "GET",
    next: {
      revalidate: METADATA_REVALIDATE_SECONDS,
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      return null as T;
    }
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || error.detail || `HTTP error! status: ${response.status}`);
  }

  return response.json();
};

/**
 * Fetch an article by slug (server-side)
 */
export const getArticle = async (slug: string): Promise<Article | null> => {
  try {
    return await serverFetch<Article>(`/api/posts/${slug}`);
  } catch (error) {
    logger.error(
      { error: sanitizeError(error), operation: "get_article", slug },
      "Error fetching article",
    );
    return null;
  }
};

/**
 * Fetch an event by slug (server-side)
 */
export const getEvent = async (slug: string): Promise<Event | null> => {
  try {
    return await serverFetch<Event>(`/api/events/${slug}`);
  } catch (error) {
    logger.error(
      { error: sanitizeError(error), operation: "get_event", slug },
      "Error fetching event",
    );
    return null;
  }
};

/**
 * Fetch an artist by slug (server-side)
 */
export const getArtist = async (slug: string): Promise<Artist | null> => {
  try {
    return await serverFetch<Artist>(`/api/artists/${slug}`);
  } catch (error) {
    logger.error(
      { error: sanitizeError(error), operation: "get_artist", slug },
      "Error fetching artist",
    );
    return null;
  }
};

/**
 * Fetch a music release by slug (server-side)
 */
export const getMusicRelease = async (
  slug: string,
): Promise<import("./music").MusicReleaseData | null> => {
  try {
    return await serverFetch<import("./music").MusicReleaseData>(`/api/music/${slug}`);
  } catch (error) {
    logger.error(
      { error: sanitizeError(error), operation: "get_music_release", slug },
      "Error fetching music release",
    );
    return null;
  }
};

/**
 * Fetch music releases (server-side)
 */
export const getMusicReleases = async (params?: {
  limit?: number;
  type?: string;
}): Promise<import("./music").MusicReleaseData[]> => {
  try {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set("limit", params.limit.toString());
    if (params?.type) searchParams.set("type", params.type);
    const qs = searchParams.toString();
    const result = await serverFetch<import("./music").MusicReleaseData[]>(
      `/api/music${qs ? `?${qs}` : ""}`,
    );
    return Array.isArray(result) ? result : [];
  } catch (error) {
    logger.error(
      { error: sanitizeError(error), operation: "get_music_releases" },
      "Error fetching music releases",
    );
    return [];
  }
};
