import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";
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
      return apiClient.get<PaginatedResponse<ArticleRead>>("/user/articles/read/");
    },
    retry: false,
  });
}

export function useMarkArticleRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (articleId: number) => {
      return apiClient.post<ArticleRead>("/user/articles/read/", { article_id: articleId });
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
      return apiClient.get<PaginatedResponse<SavedArticle>>("/user/articles/saved/");
    },
    retry: false,
  });
}

export function useSaveArticle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (articleId: number) => {
      return apiClient.post<SavedArticle>("/user/articles/saved/", { article_id: articleId });
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
      return apiClient.delete(`/user/articles/saved/${savedId}/`);
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
      return apiClient.get<PaginatedResponse<UserComment>>("/user/comments/");
    },
    retry: false,
  });
}

// Dashboard Stats
export function useDashboardStats() {
  return useQuery<DashboardStats>({
    queryKey: ["user", "stats"],
    queryFn: async () => {
      return apiClient.get<DashboardStats>("/user/stats/");
    },
    retry: false,
  });
}
