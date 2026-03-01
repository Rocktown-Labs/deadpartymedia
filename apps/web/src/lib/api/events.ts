import { useQuery } from "@tanstack/react-query";

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
  artists: {
    id: number;
    slug: string;
    name: string;
    image: string | null;
  }[];
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
  artists: {
    id: number;
    slug: string;
    name: string;
  }[];
  created_at: string;
}

export function useEvents(genre?: string) {
  return useQuery<EventList[]>({
    queryFn: async () => {
      const params = genre ? `?genre=${genre}` : "";
      const response = await fetch(`/api/events${params}`);
      const data = await response.json();
      // Handle pagination format: {results: [], count: 0}
      if (Array.isArray(data)) {
        return data;
      }
      if (data && typeof data === "object" && "results" in data && Array.isArray(data.results)) {
        return data.results;
      }
      return [];
    },
    queryKey: ["events", genre],
  });
}

export function useEvent(slug: string) {
  return useQuery<Event>({
    enabled: !!slug,
    queryFn: async () => {
      const response = await fetch(`/api/events/${slug}`);
      if (!response.ok) {
        throw new Error("Failed to fetch event");
      }
      return response.json();
    },
    queryKey: ["event", slug],
  });
}
