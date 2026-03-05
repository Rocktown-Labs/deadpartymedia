"use server";

import { TAGS } from "./constants";
import type { Cart, Product, ProductOption } from "./types";
import { logger } from "./logger";
import { sanitizeError } from "./logger/sanitize";

const FOURTHWALL_API_URL =
  process.env.NEXT_PUBLIC_FW_API_URL || "https://storefront-api.fourthwall.com/v1";
const STOREFRONT_TOKEN = process.env.NEXT_PUBLIC_FW_STOREFRONT_TOKEN;

if (!STOREFRONT_TOKEN) {
  logger.warn(
    { operation: "fourthwall_config" },
    "NEXT_PUBLIC_FW_STOREFRONT_TOKEN is not set. Fourthwall API calls will fail.",
  );
}

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

interface FourthwallCart {
  id: string;
  items: {
    variant: {
      id: string;
      name: string;
      sku: string;
      unitPrice: { value: number; currency: string };
      attributes: {
        description: string;
        color?: { name: string; swatch: string };
        size?: { name: string };
      };
      images: { url: string; transformedUrl: string }[];
      product: {
        id: string;
        name: string;
        slug: string;
      };
    };
    quantity: number;
  }[];
}

async function fourthwallFetch<T>({
  path,
  tags,
  cache = "force-cache",
}: {
  path: string;
  tags?: string[];
  cache?: RequestCache;
}): Promise<T> {
  try {
    // Ensure clean URL construction
    const baseUrl = FOURTHWALL_API_URL.endsWith("/")
      ? FOURTHWALL_API_URL
      : `${FOURTHWALL_API_URL}/`;
    const cleanPath = path.startsWith("/") ? path.slice(1) : path;
    const url = `${baseUrl}${cleanPath}`;

    logger.debug({ operation: "fourthwall_fetch", url }, "Fetching from Fourthwall");

    const result = await fetch(url, {
      cache,
      headers: {
        "Content-Type": "application/json",
      },
      method: "GET",
      ...(tags && { next: { tags } }),
    });

    if (!result.ok) {
      const errorText = await result.text();
      logger.error(
        { operation: "fourthwall_fetch", status: result.status, url },
        "Fourthwall API error",
      );
      throw new Error(`HTTP ${result.status}: ${errorText}`);
    }

    const body = await result.json();
    return body;
  } catch (error) {
    logger.error(
      { error: sanitizeError(error), operation: "fourthwall_fetch" },
      "Fourthwall fetch error",
    );
    throw error;
  }
}

async function fourthwallMutate<T>({
  path,
  body,
  method = "POST",
}: {
  path: string;
  body?: unknown;
  method?: "POST" | "PUT" | "DELETE";
}): Promise<T> {
  try {
    const baseUrl = FOURTHWALL_API_URL.endsWith("/")
      ? FOURTHWALL_API_URL
      : `${FOURTHWALL_API_URL}/`;
    const cleanPath = path.startsWith("/") ? path.slice(1) : path;
    const url = `${baseUrl}${cleanPath}`;

    logger.debug({ method, operation: "fourthwall_mutate", url }, "Mutating Fourthwall");

    const result = await fetch(url, {
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
      },
      method,
    });

    const responseBody = await result.json();

    if (!result.ok) {
      throw new Error(responseBody.message || "Fourthwall API error");
    }

    return responseBody;
  } catch (error) {
    throw new Error(`Fourthwall API error: ${error}`, { cause: error });
  }
}

function transformProduct(fwProduct: FourthwallProduct): Product {
  // Add debug logging to verify stock data
  logger.debug(
    {
      operation: "transform_product",
      product_id: fwProduct.id,
      variants: fwProduct.variants.map((v) => ({
        available: v.stock.type === "UNLIMITED" || (v.stock.inStock || 0) > 0,
        id: v.id,
        in_stock: v.stock.inStock,
        stock_type: v.stock.type,
      })),
    },
    "Transforming product with stock data",
  );

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

function transformCart(fwCart: FourthwallCart, currency: string): Cart {
  const lines = fwCart.items.map((item) => {
    const totalAmount = item.variant.unitPrice.value * item.quantity;
    return {
      cost: {
        totalAmount: {
          amount: totalAmount.toString(),
          currencyCode: currency,
        },
      },
      id: `${item.variant.id}-${fwCart.id}`,
      merchandise: {
        id: item.variant.id,
        product: {
          featuredImage: {
            altText: item.variant.product.name,
            height: 800,
            url: item.variant.images[0]?.transformedUrl || item.variant.images[0]?.url || "",
            width: 800,
          },
          handle: item.variant.product.slug,
          id: item.variant.product.id,
          title: item.variant.product.name,
        },
        selectedOptions: [
          ...(item.variant.attributes.color
            ? [{ name: "Color", value: item.variant.attributes.color.name }]
            : []),
          ...(item.variant.attributes.size
            ? [{ name: "Size", value: item.variant.attributes.size.name }]
            : []),
        ],
        title: item.variant.name,
      },
      quantity: item.quantity,
    };
  });

  const totalAmount = lines.reduce(
    (sum, line) => sum + Number.parseFloat(line.cost.totalAmount.amount),
    0,
  );
  const totalQuantity = lines.reduce((sum, line) => sum + line.quantity, 0);

  return {
    cost: {
      subtotalAmount: {
        amount: totalAmount.toString(),
        currencyCode: currency,
      },
      totalAmount: {
        amount: totalAmount.toString(),
        currencyCode: currency,
      },
    },
    currency,
    id: fwCart.id,
    lines,
    totalQuantity,
  };
}

export async function getProducts(currency = "USD"): Promise<Product[]> {
  try {
    // Get products from collections/all endpoint
    const data = await fourthwallFetch<{ results: FourthwallProduct[] }>({
      cache: "no-store",
      path: `collections/all/products?storefront_token=${STOREFRONT_TOKEN}&currency=${currency}&size=100`,
      tags: [TAGS.products],
    });

    logger.info({ count: data.results.length, operation: "get_products" }, "Found products");
    return data.results.map(transformProduct);
  } catch (error) {
    logger.error(
      { error: sanitizeError(error), operation: "get_products" },
      "Error fetching products",
    );
    return [];
  }
}

export async function getProduct(slug: string, currency = "USD"): Promise<Product | undefined> {
  if (!slug || slug === "undefined") {
    logger.warn({ operation: "get_product", slug }, "getProduct called with invalid slug");
    return undefined;
  }

  try {
    const data = await fourthwallFetch<FourthwallProduct>({
      cache: "no-store",
      path: `products/${slug}?storefront_token=${STOREFRONT_TOKEN}&currency=${currency}`,
      tags: [TAGS.products],
    });

    return transformProduct(data);
  } catch (error) {
    logger.error(
      { error: sanitizeError(error), operation: "get_product", slug },
      "Error fetching product",
    );
    return undefined;
  }
}

export async function createCart(): Promise<Cart> {
  const data = await fourthwallMutate<FourthwallCart>({
    body: { items: [] },
    path: `carts?storefront_token=${STOREFRONT_TOKEN}&currency=USD`,
  });

  return transformCart(data, "USD");
}

export async function getCart(
  cartId: string | undefined,
  currency = "USD",
): Promise<Cart | undefined> {
  if (!cartId) {
    return undefined;
  }

  try {
    const data = await fourthwallFetch<FourthwallCart>({
      cache: "no-store",
      path: `carts/${cartId}?storefront_token=${STOREFRONT_TOKEN}&currency=${currency}`,
      tags: [TAGS.cart],
    });

    return transformCart(data, currency);
  } catch {
    return undefined;
  }
}

export async function addToCart(
  cartId: string,
  lines: { merchandiseId: string; quantity: number }[],
): Promise<Cart> {
  const data = await fourthwallMutate<FourthwallCart>({
    body: {
      items: lines.map((line) => ({
        quantity: line.quantity,
        variantId: line.merchandiseId,
      })),
    },
    path: `carts/${cartId}/add?storefront_token=${STOREFRONT_TOKEN}&currency=USD`,
  });

  return transformCart(data, "USD");
}

export async function updateCart(
  cartId: string,
  lines: { id: string; merchandiseId: string; quantity: number }[],
): Promise<Cart> {
  const data = await fourthwallMutate<FourthwallCart>({
    body: {
      items: lines.map((line) => ({
        quantity: line.quantity,
        variantId: line.merchandiseId,
      })),
    },
    path: `carts/${cartId}/change?storefront_token=${STOREFRONT_TOKEN}&currency=USD`,
  });

  return transformCart(data, "USD");
}

export async function removeFromCart(cartId: string, lineIds: string[]): Promise<Cart> {
  // Extract variant IDs from line IDs (format: variantId-cartId)
  const items = lineIds.map((lineId) => {
    const variantId = lineId.split("-")[0];
    return { variantId };
  });

  const data = await fourthwallMutate<FourthwallCart>({
    body: { items },
    path: `carts/${cartId}/remove?storefront_token=${STOREFRONT_TOKEN}&currency=USD`,
  });

  return transformCart(data, "USD");
}
