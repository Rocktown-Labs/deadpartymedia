import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";
import { getArticle, getEvent, getArtist } from "@/lib/api/server";
import { getImageUrl, getSiteDefaults } from "@/lib/seo";

export const runtime = "edge";

const SITE_NAME = "Dead Party Media";
const BRAND_COLOR = "#7CFC00"; // Lime green brand color

async function getOgImageData(type: string, slug: string) {
  switch (type) {
    case "article": {
      const article = await getArticle(slug);
      if (!article) return null;
      return {
        title: article.title,
        description: article.excerpt || `Read about ${article.title}`,
        image: getImageUrl(article.cover_image),
        category: article.category,
        author: article.author?.name,
        type: "article" as const,
      };
    }
    case "event": {
      const event = await getEvent(slug);
      if (!event) return null;
      const eventDate = event.date ? new Date(event.date).toLocaleDateString() : "";
      return {
        title: event.title,
        description: event.description || `${event.venue}, ${event.location}`,
        image: getImageUrl(event.image),
        date: eventDate,
        venue: event.venue,
        type: "event" as const,
      };
    }
    case "artist": {
      const artist = await getArtist(slug);
      if (!artist) return null;
      return {
        title: artist.name,
        description: artist.bio || `Learn more about ${artist.name}`,
        image: getImageUrl(artist.image),
        genre: artist.genre,
        location: artist.location,
        type: "artist" as const,
      };
    }
    default:
      return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string; slug: string }> }
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
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#0A0A0A",
            backgroundImage: data.image && data.image !== defaultOgImage
              ? `url(${data.image})`
              : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
            position: "relative",
          }}
        >
          {/* Overlay for better text readability */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(10, 10, 10, 0.7)",
            }}
          />
          
          {/* Content */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
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
                  color: "#000",
                  padding: "8px 16px",
                  borderRadius: "4px",
                  fontSize: "18px",
                  fontWeight: "bold",
                  marginBottom: "20px",
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
                  color: "#000",
                  padding: "8px 16px",
                  borderRadius: "4px",
                  fontSize: "18px",
                  fontWeight: "bold",
                  marginBottom: "20px",
                  textTransform: "uppercase",
                }}
              >
                {data.genre}
              </div>
            )}

            {/* Title */}
            <h1
              style={{
                fontSize: data.title.length > 60 ? "56px" : "72px",
                fontWeight: "900",
                color: "#FFFFFF",
                textAlign: "center",
                marginBottom: "20px",
                lineHeight: "1.1",
                maxWidth: "1000px",
              }}
            >
              {data.title}
            </h1>

            {/* Description */}
            {data.description && (
              <p
                style={{
                  fontSize: "28px",
                  color: "#CCCCCC",
                  textAlign: "center",
                  maxWidth: "900px",
                  lineHeight: "1.4",
                  marginBottom: "20px",
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
                  fontSize: "24px",
                  color: BRAND_COLOR,
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
                  fontSize: "24px",
                  color: BRAND_COLOR,
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
                position: "absolute",
                bottom: "40px",
                right: "60px",
                fontSize: "24px",
                color: BRAND_COLOR,
                fontWeight: "bold",
              }}
            >
              {SITE_NAME}
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (error) {
    console.error("Error generating OG image:", error);
    return new Response("Error generating image", { status: 500 });
  }
}
