import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";
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
      const response = await apiClient.get<Artist[] | { results: Artist[] }>(
        `/artists/${params}`
      );
      // Handle DRF pagination format: {results: [], count: 0, next: null, previous: null}
      // Or direct array if pagination is disabled
      if (Array.isArray(response)) {
        return response;
      }
      if (
        response &&
        typeof response === "object" &&
        "results" in response &&
        Array.isArray(response.results)
      ) {
        return response.results;
      }
      return [];
    },
  });
}

export function useArtist(slug: string) {
  return useQuery<Artist>({
    queryKey: ["artist", slug],
    queryFn: async () => {
      return apiClient.get<Artist>(`/artists/${slug}/`);
    },
    enabled: !!slug,
  });
}

export function useArtistArticles(slug: string) {
  return useQuery<ArticleList[]>({
    queryKey: ["artist-articles", slug],
    queryFn: async () => {
      const response = await apiClient.get<
        ArticleList[] | { results: ArticleList[] }
      >(`/artists/${slug}/articles/`);
      // Handle DRF pagination format: {results: [], count: 0, next: null, previous: null}
      // Or direct array if pagination is disabled
      if (Array.isArray(response)) {
        return response;
      }
      if (
        response &&
        typeof response === "object" &&
        "results" in response &&
        Array.isArray(response.results)
      ) {
        return response.results;
      }
      return [];
    },
    enabled: !!slug,
  });
}

export function useArtistEvents(slug: string) {
  return useQuery<EventList[]>({
    queryKey: ["artist-events", slug],
    queryFn: async () => {
      const response = await apiClient.get<
        EventList[] | { results: EventList[] }
      >(`/artists/${slug}/events/`);
      // Handle DRF pagination format: {results: [], count: 0, next: null, previous: null}
      // Or direct array if pagination is disabled
      if (Array.isArray(response)) {
        return response;
      }
      if (
        response &&
        typeof response === "object" &&
        "results" in response &&
        Array.isArray(response.results)
      ) {
        return response.results;
      }
      return [];
    },
    enabled: !!slug,
  });
}

export function useCurrentUserArtist() {
  return useQuery<Artist | null>({
    queryKey: ["current-user-artist"],
    queryFn: async () => {
      try {
        return await apiClient.get<Artist>("/artists/me/");
      } catch {
        return null;
      }
    },
    retry: false,
  });
}

export interface ArtistUpdateData {
  name: string;
  bio: string;
  location: string;
  genre: "COUNTRY" | "EDM" | "HARDCORE & ROCK" | "HIP-HOP & R&B" | "OTHER";
  spotify_url?: string;
  spotify_artist_id?: string;
  instagram?: string;
  twitter?: string;
  tiktok?: string;
  website?: string;
  image?: File | string;
}

export function useUpdateArtist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ArtistUpdateData) => {
      const formData = new FormData();
      formData.append("name", data.name);
      formData.append("bio", data.bio);
      formData.append("location", data.location);
      formData.append("genre", data.genre);
      // Always send URL fields (even if empty) to allow clearing them
      formData.append("spotify_url", data.spotify_url || "");
      if (data.spotify_artist_id)
        formData.append("spotify_artist_id", data.spotify_artist_id);
      formData.append("instagram", data.instagram || "");
      formData.append("twitter", data.twitter || "");
      formData.append("tiktok", data.tiktok || "");
      formData.append("website", data.website || "");
      if (data.image) formData.append("image", data.image);

      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
      const response = await fetch(`${apiUrl}/artists/update_me/`, {
        method: "PATCH",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ error: response.statusText }));
        throw new Error(
          error.error ||
            error.detail ||
            `HTTP error! status: ${response.status}`
        );
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["current-user-artist"] });
      queryClient.invalidateQueries({ queryKey: ["artists"] });
    },
  });
}

export function useOnboardArtist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: OnboardArtistData) => {
      const formData = new FormData();
      formData.append("artistName", data.artistName);
      formData.append("location", data.location);
      formData.append("genre", data.genre);
      formData.append("bio", data.bio);
      if (data.spotifyId) {
        formData.append("spotifyId", data.spotifyId);
      }
      if (data.socials) {
        formData.append("socials", JSON.stringify(data.socials));
      }
      if (data.profileImage) {
        formData.append("profileImage", data.profileImage);
      }

      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
      const response = await fetch(`${apiUrl}/artists/onboard/`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ error: response.statusText }));
        throw new Error(
          error.error ||
            error.detail ||
            `HTTP error! status: ${response.status}`
        );
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["artists"] });
      queryClient.invalidateQueries({ queryKey: ["current-user-artist"] });
    },
  });
}

export function useSearchSpotifyArtists(query: string) {
  return useQuery<SpotifyArtist[]>({
    queryKey: ["spotify-search", query],
    queryFn: async () => {
      if (!query || query.length < 5) return [];
      const response = await fetch(
        `/api/spotify/search?q=${encodeURIComponent(query)}`
      );
      if (!response.ok) {
        throw new Error("Failed to search Spotify");
      }
      return response.json();
    },
    enabled: query.length >= 5,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
