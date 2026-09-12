"use client";
import HomepageClient from "@/components/homepage-client";
import type { HomepageArticle } from "@/components/homepage-client";
import { useArticles } from "@/lib/api/articles";
import type { ArticleList } from "@/lib/api/articles";
import { useEvents } from "@/lib/api/events";
import type { EventList } from "@/lib/api/events";
import { useProducts } from "@/lib/api/products";
import { useMusicReleases } from "@/lib/api/music";

export default function DeadPartyMedia() {
  // Fetch up to 100 recent articles for homepage spotlight + story archive table.
  // When the publication archive outgrows 100, transition archive to server-side query.
  const {
    data: articles,
    isLoading: articlesLoading,
    error: articlesError,
  } = useArticles(undefined, { limit: 100 });
  const { data: events, isLoading: eventsLoading } = useEvents();
  const { data: musicReleasesData } = useMusicReleases({ limit: 10 });
  const {
    data: products,
    isLoading: productsLoading,
    error: productsError,
  } = useProducts({ limit: 5 });

  // Ensure articles and events are arrays
  // If editorial APIs fail, we still render the homepage and show skeletons/empty states,
  // while keeping merch (Fourthwall) available.
  const articlesArray: ArticleList[] = Array.isArray(articles) ? articles : [];
  const eventsArray: EventList[] = Array.isArray(events) ? events : [];

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

  // Ensure products is an array
  const productsArray = Array.isArray(products) ? products : [];

  const featuredProducts = productsArray.slice(0, 5);

  const transformedMusicReleases = (musicReleasesData || []).map((r) => ({
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
    type: r.releaseType,
  }));

  return (
    <HomepageClient
      featuredArticles={featuredArticles}
      articlesData={articlesData}
      allEvents={eventsArray}
      musicReleases={transformedMusicReleases}
      featuredProducts={featuredProducts}
      isArticlesLoading={articlesLoading}
      isEventsLoading={eventsLoading}
      isProductsLoading={productsLoading}
      hasArticlesError={Boolean(articlesError)}
      hasProductsError={Boolean(productsError)}
    />
  );
}
