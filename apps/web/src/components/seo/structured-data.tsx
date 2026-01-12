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
    headline: article.title,
    description: article.excerpt,
    image: getImageUrl(article.cover_image),
    datePublished: article.published_at || article.created_at,
    dateModified: article.updated_at,
    author: {
      "@type": "Person",
      name: article.author.name,
      ...(article.author.image && { image: getImageUrl(article.author.image) }),
    },
    publisher: {
      "@type": "Organization",
      name: "Dead Party Media",
      logo: {
        "@type": "ImageObject",
        url: getImageUrl("/images/dead-party-logo.png"),
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": getAbsoluteUrl(`/article/${article.slug}`),
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
    name: event.title,
    description: event.description,
    image: getImageUrl(event.image),
    startDate: `${event.date}T${event.time || "00:00:00"}`,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: event.venue,
      address: {
        "@type": "PostalAddress",
        addressLocality: event.location,
      },
    },
    organizer: {
      "@type": "Organization",
      name: "Dead Party Media",
      url: getAbsoluteUrl("/"),
    },
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
        url: event.ticket_link,
        price: event.price || "0",
        priceCurrency: "USD",
        availability: "https://schema.org/InStock",
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
    name: artist.name,
    description: artist.bio,
    image: getImageUrl(artist.image),
    url: getAbsoluteUrl(`/artists/${artist.slug}`),
    genre: artist.genre,
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
