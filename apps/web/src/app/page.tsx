"use client";
import HomepageClient from "@/components/homepage-client";
import { useArticles } from "@/lib/api/articles";
import { useEvents } from "@/lib/api/events";
import { useProducts } from "@/lib/api/products";

export default function DeadPartyMedia() {
  const { data: articles, isLoading: articlesLoading, error: articlesError } = useArticles();
  const { data: events, isLoading: eventsLoading, error: eventsError } = useEvents();
  const { data: products, isLoading: productsLoading, error: productsError } = useProducts();

  // Ensure articles and events are arrays
  // If editorial APIs fail, we still render the homepage and show skeletons/empty states,
  // while keeping merch (Fourthwall) available.
  const articlesArray = Array.isArray(articles) ? articles : [];
  const eventsArray = Array.isArray(events) ? events : [];

  // Transform articles to match homepage-client expected format
  const transformedArticles = articlesArray.map((article: any) => ({
    ...article,
    author: typeof article.author === "string" ? article.author : article.author?.name || "Unknown",
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
    image: article.cover_image || article.image || "/placeholder.svg",
  }));

  // Transform data for homepage
  const featuredArticles = transformedArticles.slice(0, 3);
  const articlesData = transformedArticles;

  // Transform events for the homepage format
  const upcomingEvents = eventsArray
    .filter((event) => {
      try {
        return new Date(event.date) >= new Date();
      } catch {
        return false;
      }
    })
    .slice(0, 3)
    .map((event) => ({
      artist: (event.artists || []).map((a: any) => a.name).join(" & ") || "Various Artists",
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

  // Get featured products (first 5)
  const featuredProducts = productsArray.slice(0, 5);

  return (
    <HomepageClient
      featuredArticles={featuredArticles}
      articlesData={articlesData}
      upcomingEvents={upcomingEvents}
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
