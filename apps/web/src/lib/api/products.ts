import { useQuery } from "@tanstack/react-query";
import type { Product } from "@/lib/types";

interface UseProductsOptions {
  enabled?: boolean;
  limit?: number;
  currency?: string;
}

const DEFAULT_PRODUCT_LIMIT = 100;
const MAX_PRODUCT_LIMIT = 100;
const DEFAULT_CURRENCY = "USD";
const PRODUCT_STALE_TIME_MS = 24 * 60 * 60 * 1000;

function normalizeProductLimit(limit?: number): number {
  if (!Number.isFinite(limit ?? Number.NaN) || (limit ?? 0) < 1) {
    return DEFAULT_PRODUCT_LIMIT;
  }

  return Math.min(Math.trunc(limit ?? DEFAULT_PRODUCT_LIMIT), MAX_PRODUCT_LIMIT);
}

function normalizeCurrency(currency?: string): string {
  if (!currency) {
    return DEFAULT_CURRENCY;
  }

  const normalized = currency.trim().toUpperCase();
  if (normalized.length !== 3) {
    return DEFAULT_CURRENCY;
  }

  return normalized;
}

export function buildProductsApiPath({
  currency,
  limit,
}: Pick<UseProductsOptions, "currency" | "limit"> = {}) {
  const normalizedCurrency = normalizeCurrency(currency);
  const normalizedLimit = normalizeProductLimit(limit);

  return `/api/products?currency=${encodeURIComponent(normalizedCurrency)}&limit=${normalizedLimit}`;
}

export function buildProductsQueryKey({
  currency,
  limit,
}: Pick<UseProductsOptions, "currency" | "limit"> = {}) {
  const normalizedCurrency = normalizeCurrency(currency);
  const normalizedLimit = normalizeProductLimit(limit);

  return ["products", normalizedCurrency, normalizedLimit] as const;
}

export function useProducts(options: UseProductsOptions = {}) {
  const apiPath = buildProductsApiPath(options);

  return useQuery<Product[]>({
    enabled: options.enabled ?? true,
    queryFn: async ({ signal }) => {
      const response = await fetch(apiPath, { signal });
      if (!response.ok) {
        throw new Error("Failed to fetch products");
      }
      return response.json();
    },
    queryKey: buildProductsQueryKey(options),
    staleTime: PRODUCT_STALE_TIME_MS,
    gcTime: PRODUCT_STALE_TIME_MS,
    refetchOnWindowFocus: false,
  });
}
