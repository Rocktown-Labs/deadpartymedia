import type {
  ArticleComment,
  ArticleContentNode,
  ArticleDetail,
  ArticleSummary,
  ArtistDetail,
  CartResponse,
  DashboardStats,
  EventDetail,
  EventSummary,
  MonthlyHomepageStats,
  OnboardingProfile,
  PaginatedResponse,
  Product,
  UserComment,
  UserSession,
  WriterSummary,
} from "@dpmedia/contracts";
import { useAuth } from "@clerk/clerk-expo";
import { QueryClient, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as WebBrowser from "expo-web-browser";
import * as React from "react";
import { getStoredCartId, setStoredCartId } from "@/lib/cart/storage";
import { useApiClient } from "./client";

export const mobileQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnReconnect: true,
      staleTime: 60 * 1000,
    },
  },
});

function createPaginatedPath(path: string, params?: Record<string, string | number | undefined>) {
  const searchParams = new URLSearchParams();
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      searchParams.set(key, String(value));
    }
  });

  const query = searchParams.toString();
  return query ? `${path}?${query}` : path;
}

function stripHtmlTags(value: string) {
  return value
    .replaceAll(/<[^>]+>/g, " ")
    .replaceAll(/\s+/g, " ")
    .trim();
}

function sanitizeProduct(product: Product): Product {
  return {
    ...product,
    description: stripHtmlTags(product.descriptionHtml || product.description || ""),
  };
}

export function useSession() {
  const { isSignedIn } = useAuth();
  const api = useApiClient();

  return useQuery<UserSession | null>({
    enabled: isSignedIn,
    queryFn: async ({ signal }) => api.authedGet<UserSession>("/api/auth/me", signal),
    queryKey: ["session"],
    retry: false,
  });
}

export function useOnboardingProfile() {
  const { isSignedIn } = useAuth();
  const api = useApiClient();

  return useQuery<OnboardingProfile | null>({
    enabled: isSignedIn,
    queryFn: async ({ signal }) =>
      api.authedGet<OnboardingProfile>("/api/onboarding/profile", signal),
    queryKey: ["onboarding-profile"],
    retry: false,
  });
}

export function useArticles(category?: string) {
  const api = useApiClient();

  return useQuery<ArticleSummary[]>({
    queryFn: async ({ signal }) => {
      const data = await api.publicGet<PaginatedResponse<ArticleSummary>>(
        createPaginatedPath("/api/posts", category ? { category } : undefined),
        signal,
      );
      return data.results;
    },
    queryKey: ["articles", category],
  });
}

export function useArticle(slug: string) {
  const api = useApiClient();

  return useQuery<ArticleDetail>({
    enabled: Boolean(slug),
    queryFn: ({ signal }) => api.publicGet<ArticleDetail>(`/api/posts/${slug}`, signal),
    queryKey: ["article", slug],
  });
}

export function useArticleComments(slug: string) {
  const api = useApiClient();

  return useQuery<ArticleComment[]>({
    enabled: Boolean(slug),
    queryFn: async ({ signal }) => {
      const data = await api.publicGet<PaginatedResponse<ArticleComment>>(
        `/api/articles/${slug}/comments`,
        signal,
      );
      return data.results;
    },
    queryKey: ["article-comments", slug],
  });
}

export function useCreateComment() {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ content, parent, slug }: { content: string; parent?: number; slug: string }) =>
      api.authedPost<ArticleComment>(`/api/articles/${slug}/comments`, { content, parent }),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["article-comments", variables.slug] });
      queryClient.invalidateQueries({ queryKey: ["user-comments"] });
    },
  });
}

export function useEvents(genre?: string) {
  const api = useApiClient();

  return useQuery<EventSummary[]>({
    queryFn: async ({ signal }) => {
      const data = await api.publicGet<PaginatedResponse<EventSummary>>(
        createPaginatedPath("/api/events", genre ? { genre } : undefined),
        signal,
      );
      return data.results;
    },
    queryKey: ["events", genre],
  });
}

export function useEvent(slug: string) {
  const api = useApiClient();

  return useQuery<EventDetail>({
    enabled: Boolean(slug),
    queryFn: ({ signal }) => api.publicGet<EventDetail>(`/api/events/${slug}`, signal),
    queryKey: ["event", slug],
  });
}

export function useArtists(genre?: string) {
  const api = useApiClient();

  return useQuery<ArtistDetail[]>({
    queryFn: ({ signal }) =>
      api.publicGet<ArtistDetail[]>(
        createPaginatedPath("/api/artists", genre ? { genre } : undefined),
        signal,
      ),
    queryKey: ["artists", genre],
  });
}

export function useArtist(slug: string) {
  const api = useApiClient();

  return useQuery<ArtistDetail>({
    enabled: Boolean(slug),
    queryFn: ({ signal }) => api.publicGet<ArtistDetail>(`/api/artists/${slug}`, signal),
    queryKey: ["artist", slug],
  });
}

export function useArtistArticles(slug: string) {
  const api = useApiClient();

  return useQuery<ArticleSummary[]>({
    enabled: Boolean(slug),
    queryFn: ({ signal }) =>
      api.publicGet<ArticleSummary[]>(`/api/artists/${slug}/articles`, signal),
    queryKey: ["artist-articles", slug],
  });
}

export function useArtistEvents(slug: string) {
  const api = useApiClient();

  return useQuery<EventSummary[]>({
    enabled: Boolean(slug),
    queryFn: ({ signal }) => api.publicGet<EventSummary[]>(`/api/artists/${slug}/events`, signal),
    queryKey: ["artist-events", slug],
  });
}

export function useWriters() {
  const api = useApiClient();

  return useQuery<WriterSummary[]>({
    queryFn: ({ signal }) => api.publicGet<WriterSummary[]>("/api/writers", signal),
    queryKey: ["writers"],
  });
}

export function useProducts(limit = 12, currency = "USD") {
  const api = useApiClient();

  return useQuery<Product[]>({
    queryFn: async ({ signal }) => {
      const products = await api.publicGet<Product[]>(
        createPaginatedPath("/api/products", {
          currency,
          limit,
        }),
        signal,
      );
      return products.map(sanitizeProduct);
    },
    queryKey: ["products", currency, limit],
    staleTime: 24 * 60 * 60 * 1000,
  });
}

export function useMonthlyHomepageStats() {
  const api = useApiClient();

  return useQuery<MonthlyHomepageStats>({
    queryFn: ({ signal }) => api.publicGet<MonthlyHomepageStats>("/api/stats/monthly", signal),
    queryKey: ["monthly-homepage-stats"],
    staleTime: 30 * 60 * 1000,
  });
}

export function useProduct(handle: string, currency = "USD") {
  const api = useApiClient();

  return useQuery<Product>({
    enabled: Boolean(handle),
    queryFn: async ({ signal }) =>
      sanitizeProduct(
        await api.publicGet<Product>(
        `/api/products/${handle}?currency=${encodeURIComponent(currency)}`,
        signal,
      )),
    queryKey: ["product", handle, currency],
  });
}

export function useDashboardStats() {
  const api = useApiClient();
  const { isSignedIn } = useAuth();

  return useQuery<DashboardStats>({
    enabled: isSignedIn,
    queryFn: ({ signal }) => api.authedGet<DashboardStats>("/api/user/stats", signal),
    queryKey: ["dashboard-stats"],
  });
}

export function useReadArticles() {
  const api = useApiClient();
  const { isSignedIn } = useAuth();

  return useQuery<PaginatedResponse<{ article: ArticleSummary; id: number; read_at: string }>>({
    enabled: isSignedIn,
    queryFn: ({ signal }) => api.authedGet("/api/user/articles/read", signal),
    queryKey: ["read-articles"],
  });
}

export function useSavedArticles() {
  const api = useApiClient();
  const { isSignedIn } = useAuth();

  return useQuery<PaginatedResponse<{ article: ArticleSummary; id: number; saved_at: string }>>({
    enabled: isSignedIn,
    queryFn: ({ signal }) => api.authedGet("/api/user/articles/saved", signal),
    queryKey: ["saved-articles"],
  });
}

export function useUserComments() {
  const api = useApiClient();
  const { isSignedIn } = useAuth();

  return useQuery<PaginatedResponse<UserComment>>({
    enabled: isSignedIn,
    queryFn: ({ signal }) => api.authedGet("/api/user/comments", signal),
    queryKey: ["user-comments"],
  });
}

export function useMarkArticleRead() {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (articleId: number) =>
      api.authedPost("/api/user/articles/read", { article_id: articleId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["read-articles"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });
}

export function useSaveArticle() {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (articleId: number) =>
      api.authedPost("/api/user/articles/saved", { article_id: articleId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-articles"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });
}

export function useUnsaveArticle() {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (savedId: number) => api.authedDelete(`/api/user/articles/saved/${savedId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-articles"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });
}

export function useCurrentArtist() {
  const api = useApiClient();
  const { isSignedIn } = useAuth();

  return useQuery<ArtistDetail | null>({
    enabled: isSignedIn,
    queryFn: async ({ signal }) => {
      try {
        return await api.authedGet<ArtistDetail>("/api/artists/me", signal);
      } catch {
        return null;
      }
    },
    queryKey: ["current-artist"],
  });
}

export function useUpdateArtist() {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: FormData) => api.authedPatch<ArtistDetail>("/api/artists/me", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["current-artist"] });
      queryClient.invalidateQueries({ queryKey: ["onboarding-profile"] });
    },
  });
}

export function useSubmitOnboarding() {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (
      payload:
        | { role: "fan"; name: string }
        | {
            bio: string;
            genre: ArtistDetail["genre"];
            image?: string;
            instagram: string;
            location: string;
            name: string;
            phoneNumber?: string;
            role: "artist";
            spotifyArtistId: string;
            spotifyUrl: string;
            tiktok?: string;
            twitter?: string;
            website?: string;
          },
    ) => api.authedPost("/api/onboarding/profile", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding-profile"] });
      queryClient.invalidateQueries({ queryKey: ["session"] });
      queryClient.invalidateQueries({ queryKey: ["current-artist"] });
    },
  });
}

export function useCart() {
  const api = useApiClient();

  return useQuery<CartResponse>({
    queryFn: async ({ signal }) => {
      const cartId = await getStoredCartId();
      const path = cartId ? `/api/cart?cartId=${encodeURIComponent(cartId)}` : "/api/cart";
      const response = await api.publicGet<CartResponse>(path, signal);
      await setStoredCartId(response.cart?.id);
      return response;
    },
    queryKey: ["cart"],
  });
}

export function useAddToCart() {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      merchandiseId,
      quantity = 1,
    }: {
      merchandiseId: string;
      quantity?: number;
    }) => {
      const cartId = await getStoredCartId();
      const response = await api.publicPost<CartResponse>("/api/cart", {
        cartId: cartId ?? undefined,
        merchandiseId,
        quantity,
      });
      await setStoredCartId(response.cart?.id);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
  });
}

export function useUpdateCartItem() {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      merchandiseId,
      quantity,
    }: {
      merchandiseId: string;
      quantity: number;
    }) => {
      const cartId = await getStoredCartId();
      const response = await api.publicPatch<CartResponse>("/api/cart", {
        cartId: cartId ?? undefined,
        merchandiseId,
        quantity,
      });
      await setStoredCartId(response.cart?.id);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
  });
}

export function useRemoveCartItem() {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (merchandiseId: string) => {
      const cartId = await getStoredCartId();
      if (!cartId) {
        return null;
      }

      const response = await api.publicDelete<CartResponse>(
        `/api/cart?cartId=${encodeURIComponent(cartId)}&merchandiseId=${encodeURIComponent(merchandiseId)}`,
      );
      await setStoredCartId(response.cart?.id);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
  });
}

export function useOpenCheckout() {
  return useMutation({
    mutationFn: async (checkoutUrl: string | null) => {
      if (!checkoutUrl) {
        throw new Error("Checkout is not available for the current cart");
      }

      return WebBrowser.openBrowserAsync(checkoutUrl);
    },
  });
}

export function usePlainArticleContent(article?: ArticleDetail | null) {
  return React.useMemo(
    () => stripHtmlTags(article?.content_html ?? article?.content ?? ""),
    [article?.content_html, article?.content],
  );
}

export function useArticleContentDoc(article?: ArticleDetail | null) {
  return React.useMemo(() => article?.content_doc ?? null, [article?.content_doc]) as
    | ArticleContentNode
    | null;
}
