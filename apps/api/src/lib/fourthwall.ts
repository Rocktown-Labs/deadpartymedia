import type { Bindings } from "../bindings";

/**
 * Ported from apps/web/src/lib/fourthwall.ts (product fetching only — the
 * cart mutation helpers stay in the frontend for now).
 *
 * "use server" and Next.js fetch caching (tags/revalidate/force-cache) are
 * stripped: these are plain async fetch functions for the Worker.
 *
 * Env mapping (source → Bindings):
 *   NEXT_PUBLIC_FW_API_URL          → FW_API_URL
 *   NEXT_PUBLIC_FW_STOREFRONT_TOKEN → FW_STOREFRONT_TOKEN
 */

export type FourthwallEnv = Pick<Bindings, "FW_API_URL" | "FW_STOREFRONT_TOKEN">;

const DEFAULT_API_URL = "https://storefront-api.fourthwall.com/v1";
const MAX_PRODUCT_LIMIT = 100;
const DEFAULT_PRODUCT_LIMIT = 100;

// Ported from apps/web/src/lib/types.ts.

interface Money {
  amount: string;
  currencyCode: string;
}

interface Image {
  url: string;
  altText: string;
  width: number;
  height: number;
}

interface ProductOption {
  id: string;
  name: string;
  values: string[];
}

interface SelectedOption {
  name: string;
  value: string;
}

interface ProductVariant {
  id: string;
  title: string;
  availableForSale: boolean;
  selectedOptions: SelectedOption[];
  price: Money;
  images?: Image[];
}

interface Product {
  id: string;
  handle: string;
  title: string;
  description: string;
  descriptionHtml?: string;
  featuredImage: Image;
  images: Image[];
  variants: ProductVariant[];
  options: ProductOption[];
  availableForSale: boolean;
  tags?: string[];
  priceRange: {
    minVariantPrice: Money;
    maxVariantPrice: Money;
  };
}

// Ported from apps/web/src/lib/fourthwall.ts.

interface FourthwallProduct {
  id: string;
  name: string;
  slug: string;
  description: string;
  images: {
    url: string;
    transformedUrl: string;
    width: number;
    height: number;
  }[];
  variants: {
    id: string;
    name: string;
    sku: string;
    unitPrice: { value: number; currency: string };
    compareAtPrice?: { value: number; currency: string };
    attributes: {
      description: string;
      color?: { name: string; swatch: string };
      size?: { name: string };
    };
    stock: { type: "LIMITED" | "UNLIMITED"; inStock?: number };
    images: { url: string; transformedUrl: string }[];
  }[];
}

async function fourthwallFetch<T>({ apiUrl, path }: { apiUrl: string; path: string }): Promise<T> {
  try {
    // Ensure clean URL construction
    const baseUrl = apiUrl.endsWith("/") ? apiUrl : `${apiUrl}/`;
    const cleanPath = path.startsWith("/") ? path.slice(1) : path;
    const url = `${baseUrl}${cleanPath}`;

    const result = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
      },
      method: "GET",
    });

    if (!result.ok) {
      const errorText = await result.text();
      console.error("Fourthwall API error", {
        operation: "fourthwall_fetch",
        status: result.status,
        url,
      });
      throw new Error(`HTTP ${result.status}: ${errorText}`);
    }

    const body = (await result.json()) as T;
    return body;
  } catch (error) {
    console.error("Fourthwall fetch error", { error, operation: "fourthwall_fetch" });
    throw error;
  }
}

function transformProduct(fwProduct: FourthwallProduct): Product {
  const prices = fwProduct.variants.map((v) => Number.parseFloat(v.unitPrice.value.toString()));
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const currency = fwProduct.variants[0]?.unitPrice.currency || "USD";

  // Extract unique options from variants
  const optionsMap = new Map<string, Set<string>>();
  fwProduct.variants.forEach((variant) => {
    if (variant.attributes.color) {
      if (!optionsMap.has("Color")) {
        optionsMap.set("Color", new Set());
      }
      optionsMap.get("Color")?.add(variant.attributes.color.name);
    }
    if (variant.attributes.size) {
      if (!optionsMap.has("Size")) {
        optionsMap.set("Size", new Set());
      }
      optionsMap.get("Size")?.add(variant.attributes.size.name);
    }
  });

  const options: ProductOption[] = [...optionsMap.entries()].map(([name, values]) => ({
    id: name.toLowerCase(),
    name,
    values: [...values],
  }));

  return {
    availableForSale: fwProduct.variants.some(
      (v) => v.stock.type === "UNLIMITED" || (v.stock.inStock || 0) > 0,
    ),
    description: fwProduct.description,
    descriptionHtml: fwProduct.description,
    featuredImage: {
      altText: fwProduct.name,
      height: fwProduct.images[0]?.height || 800,
      url: fwProduct.images[0]?.transformedUrl || fwProduct.images[0]?.url || "",
      width: fwProduct.images[0]?.width || 800,
    },
    handle: fwProduct.slug,
    id: fwProduct.id,
    images: fwProduct.images.map((img) => ({
      altText: fwProduct.name,
      height: img.height,
      url: img.transformedUrl || img.url,
      width: img.width,
    })),
    options,
    priceRange: {
      maxVariantPrice: {
        amount: maxPrice.toString(),
        currencyCode: currency,
      },
      minVariantPrice: {
        amount: minPrice.toString(),
        currencyCode: currency,
      },
    },
    tags: [],
    title: fwProduct.name,
    variants: fwProduct.variants.map((v) => {
      // Determine availability: UNLIMITED stock is always available
      // LIMITED stock is available if inStock > 0
      const availableForSale = v.stock.type === "UNLIMITED" || (v.stock.inStock || 0) > 0;

      const selectedOptions = [
        {
          name: "Size",
          value: v.attributes.size?.name,
        },
        {
          name: "Color",
          value: v.attributes.color?.name,
        },
      ]
        .filter((opt): opt is { name: string; value: string } => Boolean(opt.value))
        .map((opt) => ({ name: opt.name, value: opt.value }));

      return {
        availableForSale,
        id: v.id,
        images: v.images.map((img) => ({
          altText: fwProduct.name,
          height: 800,
          url: img.transformedUrl || img.url,
          width: 800,
        })),
        price: {
          amount: v.unitPrice.value.toString(),
          currencyCode: v.unitPrice.currency,
        },
        selectedOptions,
        title: v.name,
      };
    }),
  };
}

function normalizeProductLimit(limit: number): number {
  if (!Number.isFinite(limit) || limit < 1) {
    return DEFAULT_PRODUCT_LIMIT;
  }

  return Math.min(Math.trunc(limit), MAX_PRODUCT_LIMIT);
}

async function fetchProductsFromSource(
  apiUrl: string,
  storefrontToken: string | undefined,
  currency: string,
  limit: number,
): Promise<Product[]> {
  const data = await fourthwallFetch<{ results: FourthwallProduct[] }>({
    apiUrl,
    path: `collections/all/products?storefront_token=${storefrontToken}&currency=${currency}&size=${limit}`,
  });

  return data.results.map(transformProduct);
}

async function fetchProductFromSource(
  apiUrl: string,
  storefrontToken: string | undefined,
  slug: string,
  currency: string,
): Promise<Product> {
  const data = await fourthwallFetch<FourthwallProduct>({
    apiUrl,
    path: `products/${slug}?storefront_token=${storefrontToken}&currency=${currency}`,
  });

  return transformProduct(data);
}

export async function getProducts(
  env: FourthwallEnv,
  currency = "USD",
  limit = DEFAULT_PRODUCT_LIMIT,
): Promise<Product[]> {
  const normalizedLimit = normalizeProductLimit(limit);
  const apiUrl = env.FW_API_URL || DEFAULT_API_URL;

  try {
    return await fetchProductsFromSource(
      apiUrl,
      env.FW_STOREFRONT_TOKEN,
      currency,
      normalizedLimit,
    );
  } catch (error) {
    console.error("Error fetching products", {
      currency,
      error,
      limit: normalizedLimit,
      operation: "get_products",
    });
    return [];
  }
}

export async function getProduct(
  env: FourthwallEnv,
  slug: string,
  currency = "USD",
): Promise<Product | undefined> {
  if (!slug || slug === "undefined") {
    console.warn("getProduct called with invalid slug", { operation: "get_product", slug });
    return undefined;
  }

  const apiUrl = env.FW_API_URL || DEFAULT_API_URL;

  try {
    return await fetchProductFromSource(apiUrl, env.FW_STOREFRONT_TOKEN, slug, currency);
  } catch (error) {
    console.error("Error fetching product", { error, operation: "get_product", slug });
    return undefined;
  }
}
