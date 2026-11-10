export interface Artist {
  id: number;
  slug: string;
  name: string;
  bio: string;
  image: string | null;
  location: string;
  genre: "COUNTRY" | "EDM" | "HARDCORE & ROCK" | "HIP-HOP & R&B" | "OTHER";
  hidden: boolean;
  spotify_url: string | null;
  spotify_artist_id: string | null;
  instagram: string | null;
  twitter: string | null;
  tiktok: string | null;
  website: string | null;
  phone_number?: string | null;
  claimed: boolean;
  article_count: number;
  event_count: number;
  profile_views: number;
  created_at: string;
}

export interface ArtistsPageResult {
  count: number;
  hasMore: boolean;
  results: Artist[];
}

export interface OnboardArtistData {
  artistName: string;
  location: string;
  genre: "COUNTRY" | "EDM" | "HARDCORE & ROCK" | "HIP-HOP & R&B" | "OTHER";
  bio: string;
  spotifyId?: string;
  socials?: {
    instagram?: string;
    twitter?: string;
    youtube?: string;
    website?: string;
  };
  profileImage?: File;
}

export interface SpotifyArtist {
  id: string;
  name: string;
  images: { url: string; height: number; width: number }[];
  external_urls: { spotify: string };
  genres?: string[];
}

export interface UpdateArtistInput {
  name: string;
  bio: string;
  location: string;
  genre: Artist["genre"];
  spotify_url?: string;
  instagram?: string;
  twitter?: string;
  tiktok?: string;
  website?: string;
  image?: File | string | null;
}
