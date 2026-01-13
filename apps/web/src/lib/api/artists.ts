import { useQuery } from "@tanstack/react-query";
import type { ArticleList } from "./articles";
import type { EventList } from "./events";

export interface Artist {
  id: number;
  slug: string;
  name: string;
  bio: string;
  image: string | null;
  location: string;
  genre: "COUNTRY" | "EDM" | "HARDCORE & ROCK" | "HIP-HOP & R&B" | "OTHER";
  spotify_url: string | null;
  spotify_artist_id: string | null;
  instagram: string | null;
  twitter: string | null;
  tiktok: string | null;
  website: string | null;
  claimed: boolean;
  article_count: number;
  event_count: number;
  profile_views: number;
  created_at: string;
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
  images: Array<{ url: string; height: number; width: number }>;
  external_urls: { spotify: string };
  genres?: string[];
}

export function useArtists(genre?: string) {
  return useQuery<Artist[]>({
    queryKey: ["artists", genre],
    queryFn: async () => {
      const params = genre ? `?genre=${genre}` : "";
      const response = await fetch(`/api/artists${params}`);
      if (!response.ok) {
        throw new Error("Failed to fetch artists");
      }
      return response.json();
    },
  });
}

export function useArtist(slug: string) {
  return useQuery<Artist>({
    queryKey: ["artist", slug],
    queryFn: async () => {
      const response = await fetch(`/api/artists/${slug}`);
      if (!response.ok) {
        throw new Error("Failed to fetch artist");
      }
      return response.json();
    },
    enabled: !!slug,
  });
}

export function useArtistArticles(slug: string) {
  return useQuery<ArticleList[]>({
    queryKey: ["artist-articles", slug],
    queryFn: async () => {
      const response = await fetch(`/api/artists/${slug}/articles`);
      if (!response.ok) {
        throw new Error("Failed to fetch artist articles");
      }
      return response.json();
    },
    enabled: !!slug,
  });
}

export function useArtistEvents(slug: string) {
  return useQuery<EventList[]>({
    queryKey: ["artist-events", slug],
    queryFn: async () => {
      const response = await fetch(`/api/artists/${slug}/events`);
      if (!response.ok) {
        throw new Error("Failed to fetch artist events");
      }
      return response.json();
    },
    enabled: !!slug,
  });
}

export function useCurrentUserArtist() {
  return useQuery<Artist | null>({
    queryKey: ["current-user-artist"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/artists/me");
        if (!response.ok) {
          if (response.status === 404) {
            return null;
          }
          throw new Error("Failed to fetch current user artist");
        }
        return response.json();
      } catch {
        return null;
      }
    },
    retry: false,
  });
}

// Note: useUpdateArtist and useOnboardArtist removed - these should use server actions instead
// See apps/web/src/app/onboarding/actions.ts for artist onboarding

export function useSearchSpotifyArtists(query: string) {
  return useQuery<SpotifyArtist[]>({
    queryKey: ["spotify-search", query],
    queryFn: async () => {
      if (!query || query.length < 5) return [];
      const response = await fetch(`/api/spotify/search?q=${encodeURIComponent(query)}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorData.error || `Failed to search Spotify (${response.status})`);
      }
      return response.json();
    },
    enabled: query.length >= 5,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
}

export function useSpotifyArtistById(id: string | null) {
  return useQuery<SpotifyArtist | null>({
    queryKey: ["spotify-artist", id],
    queryFn: async () => {
      if (!id) return null;
      const response = await fetch(`/api/spotify/artist/${encodeURIComponent(id)}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Artist not found");
        }
        throw new Error("Failed to fetch artist from Spotify");
      }
      return response.json();
    },
    enabled: !!id && id.trim().length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
}
