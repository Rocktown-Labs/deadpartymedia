import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";

export interface Article {
  id: number;
  slug: string;
  title: string;
  category: "COUNTRY" | "EDM" | "HARDCORE & ROCK" | "HIP-HOP & R&B" | "OTHER";
  excerpt: string;
  content: string;
  cover_image: string;
  author: {
    id: number;
    name: string;
    bio: string;
    image: string | null;
    role: string;
  };
  artists: Array<{
    id: number;
    slug: string;
    name: string;
    image: string | null;
  }>;
  status: "draft" | "published" | "archived";
  published_at: string | null;
  views: number;
  comment_count: number;
  created_at: string;
  updated_at: string;
}

export interface ArticleList {
  id: number;
  slug: string;
  title: string;
  category: string;
  excerpt: string;
  cover_image: string;
  author: {
    id: number;
    name: string;
  };
  artists: Array<{
    id: number;
    slug: string;
    name: string;
  }>;
  published_at: string | null;
  views: number;
  created_at: string;
}

export function useArticles(category?: string) {
  return useQuery<ArticleList[]>({
    queryKey: ["articles", category],
    queryFn: async () => {
      const params = category ? `?category=${category}` : "";
      const response = await fetch(`/api/posts${params}`);
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
  });
}

export function useArticle(slug: string) {
  return useQuery<Article>({
    queryKey: ["article", slug],
    queryFn: async () => {
      const response = await fetch(`/api/posts/${slug}`);
      if (!response.ok) {
        throw new Error("Failed to fetch article");
      }
      return response.json();
    },
    enabled: !!slug,
  });
}

export interface Comment {
  id: number;
  content: string;
  user_name?: string;
  user_email?: string;
  created_at: string;
  updated_at: string;
  replies?: Comment[];
}

export function useArticleComments(slug: string) {
  return useQuery<Comment[]>({
    queryKey: ["article-comments", slug],
    queryFn: async () => {
      const response = await apiClient.get<any>(`/articles/${slug}/comments/`);
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

export function useCreateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      slug,
      content,
      parent,
    }: {
      slug: string;
      content: string;
      parent?: number;
    }) => {
      return apiClient.post(`/articles/${slug}/comments/`, { content, parent });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["article-comments", variables.slug],
      });
    },
  });
}
