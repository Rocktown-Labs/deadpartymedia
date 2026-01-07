"use client";
import HomepageClient from "@/components/homepage-client";
import { useArticles } from "@/lib/api/articles";
import { useEvents } from "@/lib/api/events";
import { useProducts } from "@/lib/api/products";

export default function DeadPartyMedia() {
  const { data: articles, isLoading: articlesLoading, error: articlesError } = useArticles();
  const { data: events, isLoading: eventsLoading, error: eventsError } = useEvents();
  const { data: products, isLoading: productsLoading, error: productsError } = useProducts();

  // Handle loading state
  if (articlesLoading || eventsLoading || productsLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl mb-4">Loading...</div>
          <div className="w-16 h-16 border-4 border-[#7CFC00] border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  // Handle error state
  if (articlesError || eventsError || productsError) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold mb-4 text-red-500">Error Loading Content</h1>
          <p className="text-gray-400 mb-4">
            {articlesError?.message ||
              eventsError?.message ||
              productsError?.message ||
              "Failed to load content"}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-[#7CFC00] text-black font-bold rounded-lg hover:bg-[#7CFC00]/90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Ensure articles and events are arrays
  const articlesArray = Array.isArray(articles) ? articles : [];
  const eventsArray = Array.isArray(events) ? events : [];

  // Transform articles to match homepage-client expected format
  const transformedArticles = articlesArray.map((article: any) => ({
    ...article,
    image: article.cover_image || article.image || "/placeholder.svg",
    author: typeof article.author === "string" ? article.author : article.author?.name || "Unknown",
    date: article.published_at
      ? new Date(article.published_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : new Date(article.created_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
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
      date: {
        month: new Date(event.date).toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
        day: new Date(event.date).getDate().toString(),
      },
      artist: (event.artists || []).map((a: any) => a.name).join(" & ") || "Various Artists",
      venue: `${event.venue} - ${event.location}`,
      ticketUrl: event.ticket_link || "#",
      image: event.image,
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
    />
  );
}
