import { NextRequest, NextResponse } from "next/server";
import { getRequestLogger } from "@/lib/logger/middleware";
import { sanitizeError } from "@/lib/logger/sanitize";

/**
 * Search for artists on Spotify using the Spotify Web API
 * Uses Client Credentials flow (no user authentication required for search)
 */
export async function GET(request: NextRequest) {
  const log = getRequestLogger(request);
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q");

  try {

    if (!query || query.length < 5) {
      return NextResponse.json({ error: "Query must be at least 5 characters" }, { status: 400 });
    }

    // Get Spotify credentials from environment
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      log.error({ operation: "spotify_search" }, "Spotify credentials not configured");
      return NextResponse.json({ error: "Spotify API not configured" }, { status: 500 });
    }

    // Get access token using Client Credentials flow
    const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      log.error(
        { operation: "spotify_auth", status: tokenResponse.status },
        "Failed to get Spotify access token"
      );
      return NextResponse.json({ error: "Failed to authenticate with Spotify" }, { status: 500 });
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Search for artists
    const searchResponse = await fetch(
      `https://api.spotify.com/v1/search?${new URLSearchParams({
        q: query,
        type: "artist",
        limit: "10",
      })}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!searchResponse.ok) {
      log.error(
        { operation: "spotify_search", status: searchResponse.status, query },
        "Spotify search failed"
      );
      return NextResponse.json({ error: "Failed to search Spotify" }, { status: 500 });
    }

    const searchData = await searchResponse.json();
    const artists = searchData.artists?.items || [];

    // Transform to match our SpotifyArtist interface
    const formattedArtists = artists.map((artist: any) => ({
      id: artist.id,
      name: artist.name,
      images: artist.images || [],
      external_urls: artist.external_urls || {
        spotify: `https://open.spotify.com/artist/${artist.id}`,
      },
      genres: artist.genres || [],
    }));

    return NextResponse.json(formattedArtists);
  } catch (error) {
    log.error(
      { error: sanitizeError(error), operation: "spotify_search", query },
      "Error searching Spotify"
    );
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
