import { apiFetch } from "./api";

export interface GenreArticle {
  category: string;
  excerpt: string;
  id: number;
  published_at: string | null;
  slug: string;
  title: string;
}

export interface GenreLoaderData {
  articles: GenreArticle[];
  error: string | null;
}

export async function loadGenre(genre: string): Promise<GenreLoaderData> {
  try {
    const data = await apiFetch<{ results: GenreArticle[] }>(
      `/music/posts?category=${encodeURIComponent(genre)}&limit=50`,
    );
    return { articles: data.results, error: null };
  } catch {
    return { articles: [], error: "Failed to load articles" };
  }
}
