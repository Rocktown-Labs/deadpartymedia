import { zValidator } from "@hono/zod-validator";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { Hono } from "hono";

import { artists, events, posts, users } from "@dpmedia/db/schema";

import { getMusicDb as getDb } from "../../db";

import type { AppEnv, Bindings } from "../../bindings";

import { getImageUrl, getSiteDefaults } from "../../lib/og-image";

const SITE_NAME = "Dead Party Media";

// Lime green brand color
const BRAND_COLOR = "#7CFC00";

type OgArticleData = {
  author: string;
  category: string;
  description: string;
  image: string;
  title: string;
  type: "article";
};

type OgEventData = {
  date: string;
  description: string;
  image: string;
  title: string;
  type: "event";
  venue: string;
};

type OgArtistData = {
  description: string;
  genre: string;
  image: string;
  location: string;
  title: string;
  type: "artist";
};

type OgData = OgArticleData | OgEventData | OgArtistData;

export type { OgData };

/** Mirrors resolveAuthorName in apps/web/src/app/api/posts/[slug]/route.ts. */
function resolveAuthorName(
  firstName: string | null,
  lastName: string | null,
  email: string | null,
): string {
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
  if (fullName.length > 0) {
    return fullName;
  }
  if (typeof email === "string" && email.trim().length > 0) {
    return email;
  }
  return "Unknown";
}

/**
 * Same lookup as apps/web/src/app/api/posts/[slug]/route.ts: left join on
 * users for the author name, published posts only. The projection is
 * narrowed to the fields the OG template consumes (the source route also
 * selected content/tags/views, which the OG markup never renders).
 * Errors resolve to null like getArticle in apps/web/src/lib/api/server.ts.
 */
async function findArticle(env: Bindings, slug: string) {
  try {
    const db = getDb(env);
    const [row] = await db
      .select({
        authorEmail: users.email,
        authorFirstName: users.firstName,
        authorId: posts.authorId,
        authorLastName: users.lastName,
        category: posts.category,
        coverImage: posts.coverImage,
        excerpt: posts.excerpt,
        title: posts.title,
      })
      .from(posts)
      .leftJoin(users, eq(posts.authorId, users.clerkId))
      .where(and(eq(posts.slug, slug), eq(posts.status, "published")))
      .limit(1);

    if (!row) {
      return null;
    }

    return {
      author: {
        id: row.authorId,
        name: resolveAuthorName(row.authorFirstName, row.authorLastName, row.authorEmail),
      },
      category: row.category,
      coverImage: row.coverImage,
      excerpt: row.excerpt,
      title: row.title,
    };
  } catch {
    return null;
  }
}

/**
 * Same lookup as apps/web/src/app/api/events/[slug]/route.ts: published
 * events by slug (select * kept identical). Errors resolve to null like
 * getEvent in apps/web/src/lib/api/server.ts.
 */
async function findEvent(env: Bindings, slug: string) {
  try {
    const db = getDb(env);
    const [event] = await db
      .select()
      .from(events)
      .where(and(eq(events.slug, slug), eq(events.status, "published")))
      .limit(1);

    return event ?? null;
  } catch {
    return null;
  }
}

/**
 * Same lookup as apps/web/src/app/api/artists/[slug]/route.ts: non-hidden
 * artists by slug. The source's article/event count subqueries are dropped
 * from the projection — the OG template only renders bio/genre/image/
 * location/name. Errors resolve to null like getArtist in
 * apps/web/src/lib/api/server.ts.
 */
async function findArtist(env: Bindings, slug: string) {
  try {
    const db = getDb(env);
    const [artist] = await db
      .select({
        bio: artists.bio,
        genre: artists.genre,
        image: artists.image,
        location: artists.location,
        name: artists.name,
      })
      .from(artists)
      .where(and(eq(artists.slug, slug), eq(artists.hidden, false)))
      .limit(1);

    return artist ?? null;
  } catch {
    return null;
  }
}

async function getOgImageData(env: Bindings, type: string, slug: string): Promise<OgData | null> {
  const envRecord = env;
  switch (type) {
    case "article": {
      const article = await findArticle(env, slug);
      if (!article) {
        return null;
      }
      return {
        author: article.author.name,
        category: article.category,
        description: article.excerpt || `Read about ${article.title}`,
        image: getImageUrl(envRecord, article.coverImage),
        title: article.title,
        type: "article",
      };
    }
    case "event": {
      const event = await findEvent(env, slug);
      if (!event) {
        return null;
      }
      const eventDate = event.date ? new Date(event.date).toLocaleDateString() : "";
      return {
        date: eventDate,
        description: event.description || `${event.venue}, ${event.location}`,
        image: getImageUrl(envRecord, event.image),
        title: event.title,
        type: "event",
        venue: event.venue,
      };
    }
    case "artist": {
      const artist = await findArtist(env, slug);
      if (!artist) {
        return null;
      }
      return {
        description: artist.bio || `Learn more about ${artist.name}`,
        genre: artist.genre,
        image: getImageUrl(envRecord, artist.image),
        location: artist.location,
        title: artist.name,
        type: "artist",
      };
    }
    default: {
      return null;
    }
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

const BADGE_STYLE = `background-color:${BRAND_COLOR};border-radius:4px;color:#000;font-size:18px;font-weight:bold;margin-bottom:20px;padding:8px 16px;text-transform:uppercase`;

const META_STYLE = `color:${BRAND_COLOR};font-size:24px;font-weight:bold;margin-top:10px`;

/**
 * Builds the HTML equivalent of the source route's JSX tree — identical
 * element structure, styles, conditional blocks and text content.
 * Exported for tests (pure function, no runtime dependencies).
 */
export function renderOgHtml(
  env: Pick<Bindings, "WEB_APP_URL" | "MUSIC_MEDIA_URL">,
  data: OgData,
): string {
  const { defaultOgImage } = getSiteDefaults(env);

  const backgroundImage =
    data.image && data.image !== defaultOgImage
      ? // Harden the URL against breaking the style attribute; %22 is the
        // percent-encoded form of a literal quote and never appears in
        // stored image URLs.
        `url(${data.image.replaceAll('"', "%22")})`
      : undefined;

  const rootStyle = [
    "align-items:center",
    "background-color:#0A0A0A",
    ...(backgroundImage ? [`background-image:${backgroundImage}`] : []),
    "background-position:center",
    "background-size:cover",
    "display:flex",
    "flex-direction:column",
    "height:100%",
    "justify-content:center",
    "position:relative",
    "width:100%",
  ].join(";");

  const content: string[] = [];

  // Category/Badge
  if (data.type === "article" && data.category) {
    content.push(`<div style="${BADGE_STYLE}">${escapeHtml(data.category)}</div>`);
  }

  if (data.type === "artist" && data.genre) {
    content.push(`<div style="${BADGE_STYLE}">${escapeHtml(data.genre)}</div>`);
  }

  // Title
  content.push(
    `<h1 style="color:#FFFFFF;font-size:${
      data.title.length > 60 ? "56px" : "72px"
    };font-weight:900;line-height:1.1;margin-bottom:20px;max-width:1000px;text-align:center">${escapeHtml(data.title)}</h1>`,
  );

  // Description
  if (data.description) {
    const description =
      data.description.length > 150 ? `${data.description.slice(0, 150)}...` : data.description;
    content.push(
      `<p style="color:#CCCCCC;font-size:28px;line-height:1.4;margin-bottom:20px;max-width:900px;text-align:center">${escapeHtml(description)}</p>`,
    );
  }

  // Event-specific info
  if (data.type === "event" && data.date) {
    const eventInfo = `${data.date} ${data.venue && `• ${data.venue}`}`;
    content.push(`<div style="${META_STYLE}">${escapeHtml(eventInfo)}</div>`);
  }

  // Artist-specific info
  if (data.type === "artist" && data.location) {
    content.push(`<div style="${META_STYLE}">${escapeHtml(data.location)}</div>`);
  }

  // Site branding
  content.push(
    `<div style="bottom:40px;color:${BRAND_COLOR};font-size:24px;font-weight:bold;position:absolute;right:60px">${SITE_NAME}</div>`,
  );

  return (
    `<div style="${rootStyle}">` +
    // Overlay for better text readability
    `<div style="background-color:rgba(10, 10, 10, 0.7);bottom:0;left:0;position:absolute;right:0;top:0"></div>` +
    // Content
    `<div style="align-items:center;display:flex;flex-direction:column;justify-content:center;padding:60px;width:100%;z-index:1">${content.join("")}</div>` +
    `</div>`
  );
}

export const musicOgRoutes = new Hono<AppEnv>().get(
  "/og/:type/:slug",
  zValidator("query", z.record(z.string(), z.string())),
  async (c) => {
    try {
      const type = c.req.param("type");
      const slug = c.req.param("slug");
      const data = await getOgImageData(c.env, type, slug);

      if (!data) {
        // Return default OG image if data not found

        return c.body("Not Found", 404);
      }

      const envRecord = c.env;
      // Lazy import: workers-og ships a wasm module that only resolves under
      // workerd (and is mocked in tests) — never load it eagerly.
      const { ImageResponse } = await import("workers-og");
      return new ImageResponse(renderOgHtml(envRecord, data), {
        height: 630,
        width: 1200,
      });
    } catch (error) {
      console.error("Error generating OG image:", error);
      return c.body("Error generating image", 500);
    }
  },
);
