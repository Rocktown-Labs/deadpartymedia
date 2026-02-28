import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface Article {
  id: number;
  slug: string;
  title: string;
  category: "COUNTRY" | "EDM" | "HARDCORE & ROCK" | "HIP-HOP & R&B" | "OTHER";
  excerpt: string;
  content: string;
  cover_image: string;
  author: {
    id: string;
    name: string;
    bio: string;
    image: string | null;
    role: string;
  };
  artists: {
    id: number;
    slug: string;
    name: string;
    image: string | null;
  }[];
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
    id: string;
    name: string;
  };
  artists: {
    id: number;
    slug: string;
    name: string;
  }[];
  published_at: string | null;
  views: number;
  comment_count?: number;
  created_at: string;
}

export function buildPostsApiPath(category?: string) {
  if (!category) {
    return "/api/posts";
  }

  return `/api/posts?category=${encodeURIComponent(category)}`;
}

export function useArticles(category?: string) {
  return useQuery<ArticleList[]>({
    queryFn: async () => {
      const response = await fetch(buildPostsApiPath(category));
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
    queryKey: ["articles", category],
  });
}

export function useArticle(slug: string) {
  return useQuery<Article>({
    enabled: !!slug,
    queryFn: async () => {
      const response = await fetch(`/api/posts/${slug}`);
      if (!response.ok) {
        throw new Error("Failed to fetch article");
      }
      return response.json();
    },
    queryKey: ["article", slug],
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
    enabled: !!slug,
    queryFn: async ({ signal }) => {
      const response = await fetch(`/api/articles/${slug}/comments`, { signal });
      if (!response.ok) {
        throw new Error("Failed to fetch comments");
      }
      const data = await response.json();
      if (Array.isArray(data)) {
        return data;
      }
      if (data && typeof data === "object" && "results" in data && Array.isArray(data.results)) {
        return data.results as Comment[];
      }
      return [];
    },
    queryKey: ["article-comments", slug],
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
      const response = await fetch(`/api/articles/${slug}/comments`, {
        body: JSON.stringify({ content, parent }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);
        const baseErrorMessage =
          typeof errorPayload?.error === "string" ? errorPayload.error : "Failed to create comment";
        const detailsMessage = Array.isArray(errorPayload?.details)
          ? errorPayload.details
              .map((detail: unknown) =>
                typeof detail === "string"
                  ? detail
                  : (typeof detail === "object" && detail !== null
                    ? JSON.stringify(detail)
                    : ""),
              )
              .filter(Boolean)
              .join(", ")
          : "";
        throw new Error(
          detailsMessage ? `${baseErrorMessage}: ${detailsMessage}` : baseErrorMessage,
        );
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["article-comments", variables.slug],
      });
    },
  });
}
