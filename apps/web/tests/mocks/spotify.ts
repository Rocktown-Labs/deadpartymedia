import type { SpotifyArtist } from '@/lib/api/artists'

export const createMockSpotifyArtist = (overrides?: Partial<SpotifyArtist>): SpotifyArtist => ({
  id: 'spotify_artist_123',
  name: 'Test Artist',
  external_urls: {
    spotify: 'https://open.spotify.com/artist/spotify_artist_123',
  },
  images: [
    {
      url: 'https://example.com/artist-image.jpg',
      height: 640,
      width: 640,
    },
  ],
  genres: ['electronic', 'house'],
  ...overrides,
})

export const createMockSpotifySearchResponse = (artists: SpotifyArtist[] = []) => ({
  artists: {
    items: artists,
    total: artists.length,
    limit: 20,
    offset: 0,
  },
})
