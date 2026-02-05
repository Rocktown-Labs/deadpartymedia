import { useQuery } from "@tanstack/react-query";
import { getProducts } from "@/lib/fourthwall";
import type { Product } from "@/lib/types";

interface UseProductsOptions {
  enabled?: boolean;
}

export function useProducts(options: UseProductsOptions = {}) {
  return useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: async () => {
      return await getProducts();
    },
    enabled: options.enabled ?? true,
  });
}
