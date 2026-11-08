import { createFileRoute } from "@tanstack/react-router";
import HomepageClient, {
  type HomepageArticle,
} from "@/components/homepage-client";
import { getProducts } from "@/lib/fourthwall";
import type { ArticleList } from "@/lib/api/articles";
import type { EventList } from "@/lib/api/events";
import type { MusicReleaseData } from "@/lib/api/music";

const API_URL = process.env.API_URL ?? "http://localhost:8787";

async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { "content-type": "application/json" },
    method: "GET",
  });
  if (!response.ok) {
    throw new Error(`API ${response.status}: ${path}`);
  }
  return (await response.json()) as T;
}

/**
 * Ported from app/page.tsx: the Next.js server component fetched data and
 * passed it to HomepageClient. Here the loader does the same via the API.
 */
export const Route = createFileRoute("/")({
  component: RouteComponent,
  loader: async () => {
    const [articlesResult, eventsResult, musicReleasesResult] = await Promise.allSettled([
      apiGet<{ results: ArticleList[] }>("/music/posts?limit=100"),
      apiGet<{ results: EventList[] }>("/music/events?status=upcoming&limit=100"),
      apiGet<MusicReleaseData[]>("/music/releases?limit=10"),
    ]);
    const products = await getProducts("USD", 5).catch(() => []);

    const articlesArray: ArticleList[] =
      articlesResult.status === "fulfilled" ? articlesResult.value.results : [];
    const eventsArray: EventList[] =
      eventsResult.status === "fulfilled" ? eventsResult.value.results : [];
    const musicReleases: MusicReleaseData[] =
      musicReleasesResult.status === "fulfilled" ? musicReleasesResult.value : [];
    const productsArray = Array.isArray(products) ? products : [];

    const transformedArticles: HomepageArticle[] = articlesArray.map((article) => ({
      ...article,
      author: article.author?.name || "Unknown",
      date: article.published_at
        ? new Date(article.published_at).toLocaleDateString("en-US", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })
        : new Date(article.created_at).toLocaleDateString("en-US", {
            day: "numeric",
            month: "short",
            year: "numeric",
          }),
      image: article.cover_image || "/placeholder.svg",
    }));

    return {
      allEvents: eventsArray,
      articlesData: transformedArticles,
      featuredArticles: transformedArticles.slice(0, 4),
      featuredProducts: productsArray.slice(0, 5),
      hasArticlesError: articlesResult.status === "rejected",
      hasProductsError: false,
      musicReleases: musicReleases.map((r) => ({
        appleMusicUrl: r.appleMusicUrl || undefined,
        artistName: r.artistName,
        artistSlug: r.artistSlug || undefined,
        bandcampUrl: r.bandcampUrl || undefined,
        coverArt: r.coverArt || "/placeholder.svg",
        id: r.id.toString(),
        releaseDate: r.releaseDate || undefined,
        slug: r.slug,
        spotifyUrl: r.spotifyUrl || undefined,
        title: r.title,
        type: r.releaseType as "Single" | "Album" | "EP",
      })),
    };
  },
});

function RouteComponent() {
  const data = Route.useLoaderData();
  return <HomepageClient {...data} />;
}
