import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { getRequestLogger } from "@/lib/logger/middleware";
import { sanitizeError } from "@/lib/logger/sanitize";

/**
 * Get artist details by Spotify ID using the Spotify Web API
 * Uses Client Credentials flow (no user authentication required)
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const log = getRequestLogger(request);
  try {
    const { id } = await params;

    if (!id || id.trim().length === 0) {
      return NextResponse.json({ error: "Artist ID is required" }, { status: 400 });
    }

    // Get Spotify credentials from environment
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      log.error({ operation: "spotify_artist_fetch" }, "Spotify credentials not configured");
      return NextResponse.json({ error: "Spotify API not configured" }, { status: 500 });
    }

    // Get access token using Client Credentials flow
    const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
      body: new URLSearchParams({
        grant_type: "client_credentials",
      }),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      },
      method: "POST",
    });

    if (!tokenResponse.ok) {
      log.error(
        { operation: "spotify_auth", status: tokenResponse.status },
        "Failed to get Spotify access token",
      );
      return NextResponse.json({ error: "Failed to authenticate with Spotify" }, { status: 500 });
    }

    const tokenData = await tokenResponse.json();
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
        return NextResponse.json({ error: "Artist not found" }, { status: 404 });
      }
      if (artistResponse.status === 429) {
        return NextResponse.json(
          { error: "Rate limit exceeded. Please try again later." },
          { status: 429 },
        );
      }
      log.error(
        { artistId: id, operation: "spotify_artist_fetch", status: artistResponse.status },
        "Spotify artist fetch failed",
      );
      return NextResponse.json({ error: "Failed to fetch artist from Spotify" }, { status: 500 });
    }

    const artistData = await artistResponse.json();

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

    return NextResponse.json(formattedArtist);
  } catch (error) {
    log.error(
      {
        artistId: (await params).id,
        error: sanitizeError(error),
        operation: "spotify_artist_fetch",
      },
      "Error fetching Spotify artist",
    );
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
