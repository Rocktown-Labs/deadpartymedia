import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ArticleList } from "./articles";

export interface ArticleRead {
  id: number;
  article: ArticleList;
  read_at: string;
}

export interface SavedArticle {
  id: number;
  article: ArticleList;
  saved_at: string;
}

export interface UserComment {
  id: number;
  article: {
    id: number;
    slug: string;
    title: string;
    cover_image: string | null;
  };
  content: string;
  parent: number | null;
  replies: UserComment[];
  created_at: string;
  updated_at: string;
}

export interface DashboardStats {
  articles_read_count: number;
  articles_saved_count: number;
  comments_count: number;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// Read Articles
export function useReadArticles() {
  return useQuery<PaginatedResponse<ArticleRead>>({
    queryKey: ["user", "read-articles"],
    queryFn: async () => {
      const response = await fetch("/api/user/articles/read");
      if (!response.ok) {
        throw new Error("Failed to fetch read articles");
      }
      return response.json();
    },
    retry: false,
  });
}

export function useMarkArticleRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (articleId: number) => {
      const response = await fetch("/api/user/articles/read", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ article_id: articleId }),
      });
      if (!response.ok) {
        throw new Error("Failed to mark article as read");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user", "read-articles"] });
      queryClient.invalidateQueries({ queryKey: ["user", "stats"] });
    },
  });
}

// Saved Articles
export function useSavedArticles() {
  return useQuery<PaginatedResponse<SavedArticle>>({
    queryKey: ["user", "saved-articles"],
    queryFn: async () => {
      const response = await fetch("/api/user/articles/saved");
      if (!response.ok) {
        throw new Error("Failed to fetch saved articles");
      }
      return response.json();
    },
    retry: false,
  });
}

export function useSaveArticle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (articleId: number) => {
      const response = await fetch("/api/user/articles/saved", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ article_id: articleId }),
      });
      if (!response.ok) {
        throw new Error("Failed to save article");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user", "saved-articles"] });
      queryClient.invalidateQueries({ queryKey: ["user", "stats"] });
    },
  });
}

export function useUnsaveArticle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (savedId: number) => {
      const response = await fetch(`/api/user/articles/saved/${savedId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed to unsave article");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user", "saved-articles"] });
      queryClient.invalidateQueries({ queryKey: ["user", "stats"] });
    },
  });
}

// User Comments
export function useUserComments() {
  return useQuery<PaginatedResponse<UserComment>>({
    queryKey: ["user", "comments"],
    queryFn: async () => {
      const response = await fetch("/api/user/comments");
      if (!response.ok) {
        throw new Error("Failed to fetch user comments");
      }
      return response.json();
    },
    retry: false,
  });
}

// Dashboard Stats
export function useDashboardStats() {
  return useQuery<DashboardStats>({
    queryKey: ["user", "stats"],
    queryFn: async () => {
      const response = await fetch("/api/user/stats");
      if (!response.ok) {
        throw new Error("Failed to fetch dashboard stats");
      }
      return response.json();
    },
    retry: false,
  });
}
