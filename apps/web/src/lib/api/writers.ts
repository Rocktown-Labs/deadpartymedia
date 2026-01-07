import { useQuery } from "@tanstack/react-query";
import { apiClient } from "./client";

export interface Writer {
  id: number;
  name: string;
  bio: string;
  image: string | null;
  role: string;
  twitter: string | null;
  instagram: string | null;
  article_count: number;
}

export function useWriters() {
  return useQuery<Writer[]>({
    queryKey: ["writers"],
    queryFn: async () => {
      return apiClient.get<Writer[]>("/writers/");
    },
  });
}

export function useWriter(id: number) {
  return useQuery<Writer>({
    queryKey: ["writer", id],
    queryFn: async () => {
      return apiClient.get<Writer>(`/writers/${id}/`);
    },
    enabled: !!id,
  });
}
