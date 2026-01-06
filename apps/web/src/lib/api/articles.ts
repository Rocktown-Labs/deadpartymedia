import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "./client"

export interface Article {
  id: number
  slug: string
  title: string
  category: "COUNTRY" | "EDM" | "HARDCORE & ROCK" | "HIP-HOP & R&B" | "OTHER"
  excerpt: string
  content: string
  cover_image: string
  author: {
    id: number
    name: string
    bio: string
    image: string | null
    role: string
  }
  artists: Array<{
    id: number
    slug: string
    name: string
    image: string | null
  }>
  status: "draft" | "published" | "archived"
  published_at: string | null
  views: number
  comment_count: number
  created_at: string
  updated_at: string
}

export interface ArticleList {
  id: number
  slug: string
  title: string
  category: string
  excerpt: string
  cover_image: string
  author: {
    id: number
    name: string
  }
  artists: Array<{
    id: number
    slug: string
    name: string
  }>
  published_at: string | null
  views: number
  created_at: string
}

export function useArticles(category?: string) {
  return useQuery<ArticleList[]>({
    queryKey: ["articles", category],
    queryFn: async () => {
      const params = category ? `?category=${category}` : ""
      const response = await apiClient.get<any>(`/articles/${params}`)
      // Handle DRF pagination format: {results: [], count: 0, next: null, previous: null}
      // Or direct array if pagination is disabled
      return Array.isArray(response) ? response : (response.results || [])
    },
  })
}

export function useArticle(slug: string) {
  return useQuery<Article>({
    queryKey: ["article", slug],
    queryFn: async () => {
      return apiClient.get<Article>(`/articles/${slug}/`)
    },
    enabled: !!slug,
  })
}

export function useArticleComments(slug: string) {
  return useQuery({
    queryKey: ["article-comments", slug],
    queryFn: async () => {
      return apiClient.get(`/articles/${slug}/comments/`)
    },
    enabled: !!slug,
  })
}

export function useCreateComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ slug, content, parent }: { slug: string; content: string; parent?: number }) => {
      return apiClient.post(`/articles/${slug}/comments/`, { content, parent })
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["article-comments", variables.slug] })
    },
  })
}

