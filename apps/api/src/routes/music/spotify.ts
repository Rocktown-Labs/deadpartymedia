import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";

import type { AppEnv } from "../../bindings";

interface SpotifyArtistSearchItem {
  external_urls?: {
    spotify?: string;
  };
  genres?: string[];
  id: string;
  images?: { url: string; height: number; width: number }[];
  name: string;
}

interface SpotifyArtistResponse {
  external_urls?: {
    spotify?: string;
  };
  genres?: string[];
  id: string;
  images?: { url: string; height: number; width: number }[];
  name: string;
}

export const musicSpotifyRoutes = new Hono<AppEnv>()
  .get("/spotify/search", zValidator("query", z.record(z.string(), z.string())), async (c) => {
    const query = c.req.query("q");

    try {
      if (!query || query.length < 5) {
        return c.json({ error: "Query must be at least 5 characters" }, 400);
      }

      // Get Spotify credentials from environment
      const clientId = c.env.SPOTIFY_CLIENT_ID;
      const clientSecret = c.env.SPOTIFY_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        console.error("Spotify credentials not configured", { operation: "spotify_search" });
        return c.json({ error: "Spotify API not configured" }, 500);
      }

      // Get access token using Client Credentials flow
      const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
        body: new URLSearchParams({
          grant_type: "client_credentials",
        }),
        headers: {
          Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        method: "POST",
      });

      if (!tokenResponse.ok) {
        // Consume response body
        await tokenResponse.text();
        console.error("Failed to get Spotify access token", {
          operation: "spotify_auth",
          status: tokenResponse.status,
        });
        return c.json({ error: "Failed to authenticate with Spotify" }, 500);
      }

      const tokenData = (await tokenResponse.json()) as { access_token: string };
      const accessToken = tokenData.access_token;

      // Search for artists
      const searchResponse = await fetch(
        `https://api.spotify.com/v1/search?${new URLSearchParams({
          limit: "10",
          q: query,
          type: "artist",
        })}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      if (!searchResponse.ok) {
        console.error("Spotify search failed", {
          operation: "spotify_search",
          query,
          status: searchResponse.status,
        });
        return c.json({ error: "Failed to search Spotify" }, 500);
      }

      const searchData = (await searchResponse.json()) as {
        artists?: { items?: SpotifyArtistSearchItem[] };
      };
      const artistItems = searchData.artists?.items;
      const artists = Array.isArray(artistItems) ? artistItems : [];

      // Transform to match our SpotifyArtist interface
      const formattedArtists = artists.map((artist) => ({
        external_urls: artist.external_urls || {
          spotify: `https://open.spotify.com/artist/${artist.id}`,
        },
        genres: artist.genres || [],
        id: artist.id,
        images: artist.images || [],
        name: artist.name,
      }));

      return c.json(formattedArtists);
    } catch (error) {
      console.error("Error searching Spotify", { error, operation: "spotify_search", query });
      return c.json({ error: "Internal server error" }, 500);
    }
  })
  .get("/spotify/artist/:id", zValidator("query", z.record(z.string(), z.string())), async (c) => {
    const id = c.req.param("id");

    try {
      if (!id || id.trim().length === 0) {
        return c.json({ error: "Artist ID is required" }, 400);
      }

      // Get Spotify credentials from environment
      const clientId = c.env.SPOTIFY_CLIENT_ID;
      const clientSecret = c.env.SPOTIFY_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        console.error("Spotify credentials not configured", { operation: "spotify_artist_fetch" });
        return c.json({ error: "Spotify API not configured" }, 500);
      }

      // Get access token using Client Credentials flow
      const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
        body: new URLSearchParams({
          grant_type: "client_credentials",
        }),
        headers: {
          Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        method: "POST",
      });

      if (!tokenResponse.ok) {
        console.error("Failed to get Spotify access token", {
          operation: "spotify_auth",
          status: tokenResponse.status,
        });
        return c.json({ error: "Failed to authenticate with Spotify" }, 500);
      }

      const tokenData = (await tokenResponse.json()) as { access_token: string };
      const accessToken = tokenData.access_token;

      // Get artist by ID
      const artistResponse = await fetch(
        `https://api.spotify.com/v1/artists/${encodeURIComponent(id)}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      if (!artistResponse.ok) {
        if (artistResponse.status === 404) {
          return c.json({ error: "Artist not found" }, 404);
        }
        if (artistResponse.status === 429) {
          return c.json({ error: "Rate limit exceeded. Please try again later." }, 429);
        }
        console.error("Spotify artist fetch failed", {
          artistId: id,
          operation: "spotify_artist_fetch",
          status: artistResponse.status,
        });
        return c.json({ error: "Failed to fetch artist from Spotify" }, 500);
      }

      const artistData = (await artistResponse.json()) as SpotifyArtistResponse;

      // Transform to match our SpotifyArtist interface
      const formattedArtist = {
        external_urls: artistData.external_urls || {
          spotify: `https://open.spotify.com/artist/${artistData.id}`,
        },
        genres: artistData.genres || [],
        id: artistData.id,
        images: artistData.images || [],
        name: artistData.name,
      };

      return c.json(formattedArtist);
    } catch (error) {
      console.error("Error fetching Spotify artist", {
        artistId: id,
        error,
        operation: "spotify_artist_fetch",
      });
      return c.json({ error: "Internal server error" }, 500);
    }
  });
