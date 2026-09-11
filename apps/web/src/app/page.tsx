"use client";
import HomepageClient from "@/components/homepage-client";
import type { HomepageArticle, HomepageEvent } from "@/components/homepage-client";
import { useArticles } from "@/lib/api/articles";
import type { ArticleList } from "@/lib/api/articles";
import { useEvents } from "@/lib/api/events";
import type { EventList } from "@/lib/api/events";
import { isActiveEventDate } from "@/lib/events/date-state";
import { useProducts } from "@/lib/api/products";
import { useMusicReleases } from "@/lib/api/music";

export default function DeadPartyMedia() {
  const {
    data: articles,
    isLoading: articlesLoading,
    error: articlesError,
  } = useArticles(undefined, { limit: 500 });
  const { data: events, isLoading: eventsLoading, error: eventsError } = useEvents();
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

  // Transform events for the homepage format
  const upcomingEvents: HomepageEvent[] = eventsArray
    .filter((event) => isActiveEventDate(event.date))
    .slice(0, 3)
    .map((event) => ({
      artist: (event.artists || []).map((artist) => artist.name).join(" & ") || "Various Artists",
      date: {
        day: new Date(event.date).getDate().toString(),
        month: new Date(event.date).toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
      },
      image: event.image,
      ticketUrl: event.ticket_link || "#",
      venue: `${event.venue} - ${event.location}`,
    }));

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
      upcomingEvents={upcomingEvents}
      allEvents={eventsArray}
      musicReleases={transformedMusicReleases}
      featuredProducts={featuredProducts}
      isArticlesLoading={articlesLoading}
      isEventsLoading={eventsLoading}
      isProductsLoading={productsLoading}
      hasArticlesError={Boolean(articlesError)}
      hasEventsError={Boolean(eventsError)}
      hasProductsError={Boolean(productsError)}
    />
  );
}
