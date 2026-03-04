import type { SpotifyArtist } from "@/lib/api/artists";

export const createMockSpotifyArtist = (overrides?: Partial<SpotifyArtist>): SpotifyArtist => ({
  external_urls: {
    spotify: "https://open.spotify.com/artist/spotify_artist_123",
  },
  genres: ["electronic", "house"],
  id: "spotify_artist_123",
  images: [
    {
      height: 640,
      url: "https://example.com/artist-image.jpg",
      width: 640,
    },
  ],
  name: "Test Artist",
  ...overrides,
});

export const createMockSpotifySearchResponse = (artists: SpotifyArtist[] = []) => ({
  artists: {
    items: artists,
    limit: 20,
    offset: 0,
    total: artists.length,
  },
});
