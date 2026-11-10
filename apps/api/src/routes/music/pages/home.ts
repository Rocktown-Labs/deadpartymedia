import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import type { AppEnv } from "../../../bindings";
import { getMusicDb } from "../../../db";
import { getProducts } from "../../../lib/fourthwall";
import type { ArticleList } from "../../../lib/music/api/articles";
import type { EventList } from "../../../lib/music/api/events";
import {
  fetchHomepageArticles,
  fetchHomepageEvents,
  fetchHomepageMusicReleases,
} from "../../../lib/music/server/homepage-data";

export const loadHome = new Hono<AppEnv>().get(
  "/home",
  zValidator("query", z.record(z.string(), z.string())),
  async (c) => {
    const db = getMusicDb(c.env);

    const [articlesResult, eventsResult, musicReleasesResult] = await Promise.allSettled([
      fetchHomepageArticles(db, 100),
      fetchHomepageEvents(db, 100),
      fetchHomepageMusicReleases(db, 10),
    ]);

    const products = await getProducts(c.env, "USD", 5).catch(() => []);

    // If editorial APIs fail, we still render the homepage with empty states.
    const articlesArray: ArticleList[] =
      articlesResult.status === "fulfilled" ? articlesResult.value : [];

    const eventsArray: EventList[] = eventsResult.status === "fulfilled" ? eventsResult.value : [];

    const musicReleases =
      musicReleasesResult.status === "fulfilled" ? musicReleasesResult.value : [];

    const productsArray = Array.isArray(products) ? products : [];

    // Transform articles to match homepage-client expected format
    const transformedArticles = articlesArray.map((article) => ({
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

    const featuredProducts = productsArray.slice(0, 5);

    const transformedMusicReleases = musicReleases.map((r) => ({
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
      type: r.releaseType as "Single" | "Album" | "EP",
    }));
    return c.json({
      articlesResult,
      eventsArray,
      musicReleases,
      featuredArticles,
      articlesData,
      featuredProducts,
      transformedMusicReleases,
    });
  },
);
