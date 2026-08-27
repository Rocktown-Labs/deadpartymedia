import HomepageClient from "@/components/homepage-client";
import type { HomepageArticle, HomepageEvent } from "@/components/homepage-client";
import type { ArticleList } from "@/lib/api/articles";
import { listPublishedArticles } from "@/lib/api/articles.server";
import type { EventList } from "@/lib/api/events";
import { listPublishedEvents } from "@/lib/api/events.server";
import { getMonthlyHomepageStats } from "@/lib/api/stats.server";
import { isActiveEventDate } from "@/lib/events/date-state";
import { getProducts } from "@/lib/fourthwall";

async function getHomepageData() {
  const [articlesResult, eventsResult, productsResult, monthlyStatsResult] =
    await Promise.allSettled([
      listPublishedArticles({ limit: 12 }),
      listPublishedEvents({ limit: 100 }),
      getProducts("USD", 5),
      getMonthlyHomepageStats(),
    ]);

  return {
    articles:
      articlesResult.status === "fulfilled" && Array.isArray(articlesResult.value)
        ? articlesResult.value
        : [],
    events:
      eventsResult.status === "fulfilled" && Array.isArray(eventsResult.value)
        ? eventsResult.value
        : [],
    hasArticlesError: articlesResult.status === "rejected",
    hasEventsError: eventsResult.status === "rejected",
    hasProductsError: productsResult.status === "rejected",
    hasStatsError: monthlyStatsResult.status === "rejected",
    monthlyStats: monthlyStatsResult.status === "fulfilled" ? monthlyStatsResult.value : null,
    products:
      productsResult.status === "fulfilled" && Array.isArray(productsResult.value)
        ? productsResult.value
        : [],
  };
}

export default async function DeadPartyMedia() {
  const {
    articles,
    events,
    hasArticlesError,
    hasEventsError,
    hasProductsError,
    hasStatsError,
    monthlyStats,
    products,
  } = await getHomepageData();

  // Transform articles to match homepage-client expected format
  const transformedArticles: HomepageArticle[] = articles.map((article: ArticleList) => ({
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

  // Transform data for homepage
  const featuredArticles = transformedArticles.slice(0, 3);
  const articlesData = transformedArticles;

  // Transform events for the homepage format
  const upcomingEvents: HomepageEvent[] = events
    .filter((event) => isActiveEventDate(event.date))
    .slice(0, 3)
    .map((event: EventList) => ({
      artist: (event.artists || []).map((artist) => artist.name).join(" & ") || "Various Artists",
      date: {
        day: new Date(event.date).getDate().toString(),
        month: new Date(event.date).toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
      },
      image: event.image,
      ticketUrl: event.ticket_link || "#",
      venue: `${event.venue} - ${event.location}`,
    }));

  const featuredProducts = products.slice(0, 5);

  return (
    <HomepageClient
      featuredArticles={featuredArticles}
      articlesData={articlesData}
      upcomingEvents={upcomingEvents}
      featuredProducts={featuredProducts}
      monthlyStats={monthlyStats}
      hasArticlesError={hasArticlesError}
      hasEventsError={hasEventsError}
      hasProductsError={hasProductsError}
      hasStatsError={hasStatsError}
    />
  );
}
