import { useQuery } from "@tanstack/react-query";

export interface Venue {
  id: number;
  name: string;
  slug: string;
  address: string | null;
  city: string;
  state: string;
  zip: string | null;
  phone: string | null;
  website: string | null;
  capacity: string | null;
  genres: string | null;
  bookingRates: string | null;
  bookingEmail: string | null;
  description: string | null;
  image: string | null;
  createdAt: string;
}

export function useVenues() {
  return useQuery<Venue[]>({
    queryKey: ["venues"],
    queryFn: async () => {
      const response = await fetch("/api/venues");
      if (!response.ok) {
        throw new Error("Failed to fetch venues");
      }
      return response.json();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
