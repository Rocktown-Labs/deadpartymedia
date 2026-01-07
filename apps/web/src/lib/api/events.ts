import { useQuery } from "@tanstack/react-query";
import { apiClient } from "./client";

export interface Event {
  id: number;
  slug: string;
  title: string;
  description: string;
  image: string;
  venue: string;
  location: string;
  date: string;
  time: string;
  ticket_link: string | null;
  price: string | null;
  genre: "COUNTRY" | "EDM" | "HARDCORE & ROCK" | "HIP-HOP & R&B" | "OTHER";
  status: "draft" | "published" | "past";
  artists: Array<{
    id: number;
    slug: string;
    name: string;
    image: string | null;
  }>;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface EventList {
  id: number;
  slug: string;
  title: string;
  description: string;
  image: string;
  venue: string;
  location: string;
  date: string;
  time: string;
  ticket_link: string | null;
  price: string | null;
  genre: string;
  artists: Array<{
    id: number;
    slug: string;
    name: string;
  }>;
  created_at: string;
}

export function useEvents(genre?: string) {
  return useQuery<EventList[]>({
    queryKey: ["events", genre],
    queryFn: async () => {
      const params = genre ? `?genre=${genre}` : "";
      const response = await apiClient.get<EventList[] | { results: EventList[] }>(
        `/events/${params}`,
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

export function useEvent(slug: string) {
  return useQuery<Event>({
    queryKey: ["event", slug],
    queryFn: async () => {
      return apiClient.get<Event>(`/events/${slug}/`);
    },
    enabled: !!slug,
  });
}
