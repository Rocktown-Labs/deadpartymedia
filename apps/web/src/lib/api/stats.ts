import { useQuery } from "@tanstack/react-query";

export interface MonthlyStats {
  monthStart: string;
  monthEnd: string;
  featuredArtistsCount: number;
  liveEventsCount: number;
  newArticlesCount: number;
}

export function useMonthlyHomepageStats() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();

  return useQuery<MonthlyStats>({
    queryKey: ["stats", "monthly", year, month],
    queryFn: async () => {
      const response = await fetch("/api/stats/monthly");
      if (!response.ok) {
        throw new Error("Failed to fetch monthly stats");
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - stats don't change frequently
    refetchOnWindowFocus: false, // Don't refetch on window focus for stats
  });
}
