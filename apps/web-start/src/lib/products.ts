/**
 * Product shape returned by the platform API's Fourthwall proxy
 * (apps/api/src/lib/fourthwall.ts — identical to the web app's
 * lib/api/products.ts Product).
 */
export interface ApiProduct {
  description: string | null;
  featuredImage: { altText: string | null; height: number; url: string; width: number } | null;
  handle: string;
  id: string;
  images: { altText: string | null; height: number; url: string; width: number }[];
  title: string;
  variants: {
    availableForSale: boolean;
    id: string;
    price: { amount: string; currencyCode: string };
    selectedOptions: { name: string; value: string }[];
    title: string;
  }[];
}

export function formatVariantPrice(variant: ApiProduct["variants"][number]): string {
  const amount = Number.parseFloat(variant.price.amount);
  if (!Number.isFinite(amount)) {
    return variant.price.amount;
  }
  return `${variant.price.currencyCode} ${amount.toFixed(2)}`;
}
