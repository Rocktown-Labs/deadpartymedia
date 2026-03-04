import { ImageResponse } from "@vercel/og";
import type { NextRequest } from "next/server";
import { getArticle, getEvent, getArtist } from "@/lib/api/server";
import { getImageUrl, getSiteDefaults } from "@/lib/seo";

export const runtime = "edge";

const SITE_NAME = "Dead Party Media";
const BRAND_COLOR = "#7CFC00"; // Lime green brand color

async function getOgImageData(type: string, slug: string) {
  switch (type) {
    case "article": {
      const article = await getArticle(slug);
      if (!article) {
        return null;
      }
      return {
        author: article.author?.name,
        category: article.category,
        description: article.excerpt || `Read about ${article.title}`,
        image: getImageUrl(article.cover_image),
        title: article.title,
        type: "article" as const,
      };
    }
    case "event": {
      const event = await getEvent(slug);
      if (!event) {
        return null;
      }
      const eventDate = event.date ? new Date(event.date).toLocaleDateString() : "";
      return {
        date: eventDate,
        description: event.description || `${event.venue}, ${event.location}`,
        image: getImageUrl(event.image),
        title: event.title,
        type: "event" as const,
        venue: event.venue,
      };
    }
    case "artist": {
      const artist = await getArtist(slug);
      if (!artist) {
        return null;
      }
      return {
        description: artist.bio || `Learn more about ${artist.name}`,
        genre: artist.genre,
        image: getImageUrl(artist.image),
        location: artist.location,
        title: artist.name,
        type: "artist" as const,
      };
    }
    default: {
      return null;
    }
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string; slug: string }> },
) {
  try {
    const { type, slug } = await params;
    const data = await getOgImageData(type, slug);

    if (!data) {
      // Return default OG image if data not found
      return new Response("Not Found", { status: 404 });
    }

    const { defaultOgImage } = getSiteDefaults();

    return new ImageResponse(
      <div
        style={{
          alignItems: "center",
          backgroundColor: "#0A0A0A",
          backgroundImage:
            data.image && data.image !== defaultOgImage ? `url(${data.image})` : undefined,
          backgroundPosition: "center",
          backgroundSize: "cover",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          justifyContent: "center",
          position: "relative",
          width: "100%",
        }}
      >
        {/* Overlay for better text readability */}
        <div
          style={{
            backgroundColor: "rgba(10, 10, 10, 0.7)",
            bottom: 0,
            left: 0,
            position: "absolute",
            right: 0,
            top: 0,
          }}
        />

        {/* Content */}
        <div
          style={{
            alignItems: "center",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "60px",
            width: "100%",
            zIndex: 1,
          }}
        >
          {/* Category/Badge */}
          {data.type === "article" && data.category && (
            <div
              style={{
                backgroundColor: BRAND_COLOR,
                borderRadius: "4px",
                color: "#000",
                fontSize: "18px",
                fontWeight: "bold",
                marginBottom: "20px",
                padding: "8px 16px",
                textTransform: "uppercase",
              }}
            >
              {data.category}
            </div>
          )}

          {data.type === "artist" && data.genre && (
            <div
              style={{
                backgroundColor: BRAND_COLOR,
                borderRadius: "4px",
                color: "#000",
                fontSize: "18px",
                fontWeight: "bold",
                marginBottom: "20px",
                padding: "8px 16px",
                textTransform: "uppercase",
              }}
            >
              {data.genre}
            </div>
          )}

          {/* Title */}
          <h1
            style={{
              color: "#FFFFFF",
              fontSize: data.title.length > 60 ? "56px" : "72px",
              fontWeight: "900",
              lineHeight: "1.1",
              marginBottom: "20px",
              maxWidth: "1000px",
              textAlign: "center",
            }}
          >
            {data.title}
          </h1>

          {/* Description */}
          {data.description && (
            <p
              style={{
                color: "#CCCCCC",
                fontSize: "28px",
                lineHeight: "1.4",
                marginBottom: "20px",
                maxWidth: "900px",
                textAlign: "center",
              }}
            >
              {data.description.length > 150
                ? `${data.description.slice(0, 150)}...`
                : data.description}
            </p>
          )}

          {/* Event-specific info */}
          {data.type === "event" && data.date && (
            <div
              style={{
                color: BRAND_COLOR,
                fontSize: "24px",
                fontWeight: "bold",
                marginTop: "10px",
              }}
            >
              {data.date} {data.venue && `• ${data.venue}`}
            </div>
          )}

          {/* Artist-specific info */}
          {data.type === "artist" && data.location && (
            <div
              style={{
                color: BRAND_COLOR,
                fontSize: "24px",
                fontWeight: "bold",
                marginTop: "10px",
              }}
            >
              {data.location}
            </div>
          )}

          {/* Site branding */}
          <div
            style={{
              bottom: "40px",
              color: BRAND_COLOR,
              fontSize: "24px",
              fontWeight: "bold",
              position: "absolute",
              right: "60px",
            }}
          >
            {SITE_NAME}
          </div>
        </div>
      </div>,
      {
        height: 630,
        width: 1200,
      },
    );
  } catch (error) {
    console.error("Error generating OG image:", error);
    return new Response("Error generating image", { status: 500 });
  }
}
