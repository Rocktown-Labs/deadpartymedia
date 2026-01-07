import { useQuery } from "@tanstack/react-query";
import { getProducts } from "@/lib/fourthwall";
import type { Product } from "@/lib/types";

export function useProducts() {
  return useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: async () => {
      return await getProducts();
    },
  });
}
