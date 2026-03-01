import { useQuery } from "@tanstack/react-query";

export interface Writer {
  id: number;
  name: string;
  bio: string;
  image: string | null;
  role: string;
  twitter: string | null;
  instagram: string | null;
  articleCount: number;
}

export function useWriters() {
  return useQuery<Writer[]>({
    queryFn: async ({ signal }) => {
      const response = await fetch("/api/writers", { signal });
      if (!response.ok) {
        throw new Error("Failed to fetch writers");
      }
      return response.json();
    },
    queryKey: ["writers"],
  });
}

export function useWriter(id: number) {
  return useQuery<Writer>({
    enabled: !!id,
    queryFn: async ({ signal }) => {
      const response = await fetch(`/api/writers/${id}`, { signal });
      if (!response.ok) {
        throw new Error("Failed to fetch writer");
      }
      return response.json();
    },
    queryKey: ["writer", id],
  });
}
