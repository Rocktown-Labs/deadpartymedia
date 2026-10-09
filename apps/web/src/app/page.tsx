import HomepageClient from "@/components/homepage-client";
import type { HomepageArticle } from "@/components/homepage-client";
import { getProducts } from "@/lib/fourthwall";
import {
  fetchHomepageArticles,
  fetchHomepageEvents,
  fetchHomepageMusicReleases,
} from "@/lib/server/homepage-data";
import type { ArticleList } from "@/lib/api/articles";
import type { EventList } from "@/lib/api/events";

// Data is fetched on the server so the initial HTML contains real content:
// no skeleton swap (CLS), no late LCP image, no client fetch waterfall.
export default async function DeadPartyMedia() {
  const [articlesResult, eventsResult, musicReleasesResult] = await Promise.allSettled([
    fetchHomepageArticles(100),
    fetchHomepageEvents(100),
    fetchHomepageMusicReleases(10),
  ]);
  const products = await getProducts("USD", 5).catch(() => []);

  // If editorial APIs fail, we still render the homepage with empty states.
  const articlesArray: ArticleList[] =
    articlesResult.status === "fulfilled" ? articlesResult.value : [];
  const eventsArray: EventList[] = eventsResult.status === "fulfilled" ? eventsResult.value : [];
  const musicReleases = musicReleasesResult.status === "fulfilled" ? musicReleasesResult.value : [];
  const productsArray = Array.isArray(products) ? products : [];

  // Transform articles to match homepage-client expected format
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

  // Transform data for homepage: 1 hero spotlight + up to 3 cards underneath
  const featuredArticles = transformedArticles.slice(0, 4);
  const articlesData = transformedArticles;
  const featuredProducts = productsArray.slice(0, 5);

  const transformedMusicReleases = musicReleases.map((r) => ({
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
  }));

  return (
    <HomepageClient
      featuredArticles={featuredArticles}
      articlesData={articlesData}
      allEvents={eventsArray}
      musicReleases={transformedMusicReleases}
      featuredProducts={featuredProducts}
      hasArticlesError={articlesResult.status === "rejected"}
      hasProductsError={false}
    />
  );
}
