import { useQuery } from "@tanstack/react-query";

export interface MusicReleaseData {
  id: number;
  slug: string;
  title: string;
  artistName: string;
  artistSlug?: string | null;
  artistId?: number | null;
  artistBio?: string | null;
  artistImage?: string | null;
  releaseType: "Album" | "Single" | "EP";
  genre: string;
  releaseDate: string | null;
  coverArt: string | null;
  excerpt: string;
  content: string | null;
  spotifyUrl: string | null;
  appleMusicUrl: string | null;
  bandcampUrl: string | null;
  youtubeUrl: string | null;
  featured: boolean;
  views?: number;
  createdAt: string;
  author?: {
    id: string;
    name: string;
  };
}

interface MusicReleasesFilters {
  featured?: boolean;
  genre?: string;
  limit?: number;
  offset?: number;
  type?: "Album" | "Single" | "EP";
}

export function useMusicReleases(filters?: MusicReleasesFilters) {
  const queryParams = new URLSearchParams();
  if (filters?.type) {
    queryParams.set("type", filters.type);
  }
  if (filters?.genre) {
    queryParams.set("genre", filters.genre);
  }
  if (filters?.featured !== undefined) {
    queryParams.set("featured", filters.featured.toString());
  }
  if (filters?.limit) {
    queryParams.set("limit", filters.limit.toString());
  }
  if (filters?.offset) {
    queryParams.set("offset", filters.offset.toString());
  }

  const queryString = queryParams.toString();
  const url = `/api/music${queryString ? `?${queryString}` : ""}`;

  return useQuery<MusicReleaseData[]>({
    queryFn: async () => {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error("Failed to fetch music releases");
      }
      return res.json();
    },
    queryKey: ["music-releases", filters],
    staleTime: 60 * 1000,
  });
}

export function useMusicRelease(slug: string) {
  return useQuery<MusicReleaseData>({
    enabled: Boolean(slug),
    queryFn: async () => {
      const res = await fetch(`/api/music/${slug}`);
      if (!res.ok) {
        throw new Error("Failed to fetch music release");
      }
      return res.json();
    },
    queryKey: ["music-release", slug],
    staleTime: 60 * 1000,
  });
}
