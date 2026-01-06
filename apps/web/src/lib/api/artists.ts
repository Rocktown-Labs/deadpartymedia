import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";

export interface Artist {
  id: number;
  slug: string;
  name: string;
  bio: string;
  image: string | null;
  location: string;
  genre: "Country" | "EDM" | "Hardcore & Rock" | "Hip-Hop & R&B" | "Other";
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
  genre: "Country" | "EDM" | "Hardcore & Rock" | "Hip-Hop & R&B" | "Other";
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

export function useArtists(genre?: string) {
  return useQuery<Artist[]>({
    queryKey: ["artists", genre],
    queryFn: async () => {
      const params = genre ? `?genre=${genre}` : "";
      return apiClient.get<Artist[]>(`/artists/${params}`);
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
  return useQuery({
    queryKey: ["artist-articles", slug],
    queryFn: async () => {
      return apiClient.get(`/artists/${slug}/articles/`);
    },
    enabled: !!slug,
  });
}

export function useArtistEvents(slug: string) {
  return useQuery({
    queryKey: ["artist-events", slug],
    queryFn: async () => {
      return apiClient.get(`/artists/${slug}/events/`);
    },
    enabled: !!slug,
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
    },
  });
}
