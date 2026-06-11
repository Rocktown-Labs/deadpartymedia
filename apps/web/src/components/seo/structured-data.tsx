import type { Article } from "@/lib/api/articles";
import type { Event } from "@/lib/api/events";
import type { Artist } from "@/lib/api/artists";
import { getAbsoluteUrl, getImageUrl } from "@/lib/seo";

interface ArticleStructuredDataProps {
  article: Article;
}

export function ArticleStructuredData({ article }: ArticleStructuredDataProps) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Article",
    author: {
      "@type": "Person",
      name: article.author.name,
      ...(article.author.image && { image: getImageUrl(article.author.image) }),
    },
    dateModified: article.updated_at,
    datePublished: article.published_at || article.created_at,
    description: article.excerpt,
    headline: article.title,
    image: getImageUrl(article.cover_image),
    keywords: article.tags?.join(", "),
    mainEntityOfPage: {
      "@id": getAbsoluteUrl(`/article/${article.slug}`),
      "@type": "WebPage",
    },
    publisher: {
      "@type": "Organization",
      logo: {
        "@type": "ImageObject",
        url: getImageUrl("/images/dead-party-logo.png"),
      },
      name: "Dead Party Media",
    },
    ...(article.artists &&
      article.artists.length > 0 && {
        about: article.artists.map((artist) => ({
          "@type": "MusicGroup",
          name: artist.name,
          url: getAbsoluteUrl(`/artists/${artist.slug}`),
        })),
      }),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}

interface EventStructuredDataProps {
  event: Event;
}

export function EventStructuredData({ event }: EventStructuredDataProps) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Event",
    description: event.description,
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    image: getImageUrl(event.image),
    location: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: event.location,
      },
      name: event.venue,
    },
    name: event.title,
    organizer: {
      "@type": "Organization",
      name: "Dead Party Media",
      url: getAbsoluteUrl("/"),
    },
    startDate: `${event.date}T${event.time || "00:00:00"}`,
    ...(event.artists &&
      event.artists.length > 0 && {
        performer: event.artists.map((artist) => ({
          "@type": "MusicGroup",
          name: artist.name,
          url: getAbsoluteUrl(`/artists/${artist.slug}`),
        })),
      }),
    ...(event.ticket_link && {
      offers: {
        "@type": "Offer",
        availability: "https://schema.org/InStock",
        price: event.price || "0",
        priceCurrency: "USD",
        url: event.ticket_link,
      },
    }),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}

interface ArtistStructuredDataProps {
  artist: Artist;
}

export function ArtistStructuredData({ artist }: ArtistStructuredDataProps) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "MusicGroup",
    description: artist.bio,
    genre: artist.genre,
    image: getImageUrl(artist.image),
    name: artist.name,
    url: getAbsoluteUrl(`/artists/${artist.slug}`),
    ...(artist.spotify_url && {
      sameAs: [
        artist.spotify_url,
        ...(artist.instagram ? [artist.instagram] : []),
        ...(artist.twitter ? [artist.twitter] : []),
        ...(artist.tiktok ? [artist.tiktok] : []),
        ...(artist.website ? [artist.website] : []),
      ].filter(Boolean),
    }),
    ...(!artist.spotify_url && {
      sameAs: [
        ...(artist.instagram ? [artist.instagram] : []),
        ...(artist.twitter ? [artist.twitter] : []),
        ...(artist.tiktok ? [artist.tiktok] : []),
        ...(artist.website ? [artist.website] : []),
      ].filter(Boolean),
    }),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}
