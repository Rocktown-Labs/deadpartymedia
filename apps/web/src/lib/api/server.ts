import type { Article } from "./articles";
import type { Event } from "./events";
import type { Artist } from "./artists";
import { logger } from "../logger";
import { sanitizeError } from "../logger/sanitize";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

/**
 * Server-side API client for fetching data without browser dependencies.
 * Used for generating metadata in Next.js server components.
 */
async function serverFetch<T>(endpoint: string): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    // Don't cache by default - let Next.js handle caching
    cache: "no-store",
  });

  if (!response.ok) {
    if (response.status === 404) {
      return null as T;
    }
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || error.detail || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

/**
 * Fetch an article by slug (server-side)
 */
export async function getArticle(slug: string): Promise<Article | null> {
  try {
    return await serverFetch<Article>(`/articles/${slug}/`);
  } catch (error) {
    logger.error(
      { error: sanitizeError(error), operation: "get_article", slug },
      "Error fetching article"
    );
    return null;
  }
}

/**
 * Fetch an event by slug (server-side)
 */
export async function getEvent(slug: string): Promise<Event | null> {
  try {
    return await serverFetch<Event>(`/events/${slug}/`);
  } catch (error) {
    logger.error(
      { error: sanitizeError(error), operation: "get_event", slug },
      "Error fetching event"
    );
    return null;
  }
}

/**
 * Fetch an artist by slug (server-side)
 */
export async function getArtist(slug: string): Promise<Artist | null> {
  try {
    return await serverFetch<Artist>(`/artists/${slug}/`);
  } catch (error) {
    logger.error(
      { error: sanitizeError(error), operation: "get_artist", slug },
      "Error fetching artist"
    );
    return null;
  }
}
