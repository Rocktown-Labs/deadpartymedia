"use server";

import { TAGS } from "./constants";
import type { Cart, Product, ProductOption } from "./types";
import { logger } from "./logger";
import { sanitizeError } from "./logger/sanitize";

const FOURTHWALL_API_URL =
  process.env.NEXT_PUBLIC_FW_API_URL ||
  "https://storefront-api.fourthwall.com/v1";
const STOREFRONT_TOKEN = process.env.NEXT_PUBLIC_FW_STOREFRONT_TOKEN;

if (!STOREFRONT_TOKEN) {
  logger.warn(
    { operation: "fourthwall_config" },
    "NEXT_PUBLIC_FW_STOREFRONT_TOKEN is not set. Fourthwall API calls will fail."
  );
}

type FourthwallProduct = {
  id: string;
  name: string;
  slug: string;
  description: string;
  images: Array<{
    url: string;
    transformedUrl: string;
    width: number;
    height: number;
  }>;
  variants: Array<{
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
    images: Array<{ url: string; transformedUrl: string }>;
  }>;
};

type FourthwallCart = {
  id: string;
  items: Array<{
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
      images: Array<{ url: string; transformedUrl: string }>;
      product: {
        id: string;
        name: string;
        slug: string;
      };
    };
    quantity: number;
  }>;
};

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
    const cleanPath = path.startsWith("/") ? path.substring(1) : path;
    const url = `${baseUrl}${cleanPath}`;

    logger.debug(
      { operation: "fourthwall_fetch", url },
      "Fetching from Fourthwall"
    );

    const result = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache,
      ...(tags && { next: { tags } }),
    });

    if (!result.ok) {
      const errorText = await result.text();
      logger.error(
        { operation: "fourthwall_fetch", status: result.status, url },
        "Fourthwall API error"
      );
      throw new Error(`HTTP ${result.status}: ${errorText}`);
    }

    const body = await result.json();
    return body;
  } catch (e) {
    logger.error(
      { error: sanitizeError(e), operation: "fourthwall_fetch" },
      "Fourthwall fetch error"
    );
    throw e;
  }
}

async function fourthwallMutate<T>({
  path,
  body,
  method = "POST",
}: {
  path: string;
  body?: any;
  method?: "POST" | "PUT" | "DELETE";
}): Promise<T> {
  try {
    const baseUrl = FOURTHWALL_API_URL.endsWith("/")
      ? FOURTHWALL_API_URL
      : `${FOURTHWALL_API_URL}/`;
    const cleanPath = path.startsWith("/") ? path.substring(1) : path;
    const url = `${baseUrl}${cleanPath}`;

    logger.debug(
      { operation: "fourthwall_mutate", url, method },
      "Mutating Fourthwall"
    );

    const result = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });

    const responseBody = await result.json();

    if (!result.ok) {
      throw new Error(responseBody.message || "Fourthwall API error");
    }

    return responseBody;
  } catch (e) {
    throw new Error(`Fourthwall API error: ${e}`);
  }
}

function transformProduct(fwProduct: FourthwallProduct): Product {
  // Add debug logging to verify stock data
  logger.debug(
    {
      operation: "transform_product",
      product_id: fwProduct.id,
      variants: fwProduct.variants.map((v) => ({
        id: v.id,
        stock_type: v.stock.type,
        in_stock: v.stock.inStock,
        available: v.stock.type === "UNLIMITED" || (v.stock.inStock || 0) > 0,
      })),
    },
    "Transforming product with stock data"
  );

  const prices = fwProduct.variants.map((v) =>
    Number.parseFloat(v.unitPrice.value.toString())
  );
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const currency = fwProduct.variants[0]?.unitPrice.currency || "USD";

  // Extract unique options from variants
  const optionsMap = new Map<string, Set<string>>();
  fwProduct.variants.forEach((variant) => {
    if (variant.attributes.color) {
      if (!optionsMap.has("Color")) optionsMap.set("Color", new Set());
      optionsMap.get("Color")?.add(variant.attributes.color.name);
    }
    if (variant.attributes.size) {
      if (!optionsMap.has("Size")) optionsMap.set("Size", new Set());
      optionsMap.get("Size")?.add(variant.attributes.size.name);
    }
  });

  const options: ProductOption[] = Array.from(optionsMap.entries()).map(
    ([name, values]) => ({
      id: name.toLowerCase(),
      name,
      values: Array.from(values),
    })
  );

  return {
    id: fwProduct.id,
    title: fwProduct.name,
    handle: fwProduct.slug,
    description: fwProduct.description,
    descriptionHtml: fwProduct.description,
    availableForSale: fwProduct.variants.some(
      (v) => v.stock.type === "UNLIMITED" || (v.stock.inStock || 0) > 0
    ),
    featuredImage: {
      url:
        fwProduct.images[0]?.transformedUrl || fwProduct.images[0]?.url || "",
      altText: fwProduct.name,
      width: fwProduct.images[0]?.width || 800,
      height: fwProduct.images[0]?.height || 800,
    },
    images: fwProduct.images.map((img) => ({
      url: img.transformedUrl || img.url,
      altText: fwProduct.name,
      width: img.width,
      height: img.height,
    })),
    variants: fwProduct.variants.map((v) => {
      // Determine availability: UNLIMITED stock is always available
      // LIMITED stock is available if inStock > 0
      const availableForSale =
        v.stock.type === "UNLIMITED" || (v.stock.inStock || 0) > 0;

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
        id: v.id,
        title: v.name,
        availableForSale,
        selectedOptions,
        price: {
          amount: v.unitPrice.value.toString(),
          currencyCode: v.unitPrice.currency,
        },
        images: v.images.map((img) => ({
          url: img.transformedUrl || img.url,
          altText: fwProduct.name,
          width: 800,
          height: 800,
        })),
      };
    }),
    options,
    priceRange: {
      minVariantPrice: {
        amount: minPrice.toString(),
        currencyCode: currency,
      },
      maxVariantPrice: {
        amount: maxPrice.toString(),
        currencyCode: currency,
      },
    },
    tags: [],
  };
}

function transformCart(fwCart: FourthwallCart, currency: string): Cart {
  const lines = fwCart.items.map((item) => {
    const totalAmount = item.variant.unitPrice.value * item.quantity;
    return {
      id: `${item.variant.id}-${fwCart.id}`,
      quantity: item.quantity,
      cost: {
        totalAmount: {
          amount: totalAmount.toString(),
          currencyCode: currency,
        },
      },
      merchandise: {
        id: item.variant.id,
        title: item.variant.name,
        selectedOptions: [
          ...(item.variant.attributes.color
            ? [{ name: "Color", value: item.variant.attributes.color.name }]
            : []),
          ...(item.variant.attributes.size
            ? [{ name: "Size", value: item.variant.attributes.size.name }]
            : []),
        ],
        product: {
          id: item.variant.product.id,
          handle: item.variant.product.slug,
          title: item.variant.product.name,
          featuredImage: {
            url:
              item.variant.images[0]?.transformedUrl ||
              item.variant.images[0]?.url ||
              "",
            altText: item.variant.product.name,
            width: 800,
            height: 800,
          },
        },
      },
    };
  });

  const totalAmount = lines.reduce(
    (sum, line) => sum + Number.parseFloat(line.cost.totalAmount.amount),
    0
  );
  const totalQuantity = lines.reduce((sum, line) => sum + line.quantity, 0);

  return {
    id: fwCart.id,
    totalQuantity,
    lines,
    currency,
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
  };
}

export async function getProducts(currency = "USD"): Promise<Product[]> {
  try {
    // Get products from collections/all endpoint
    const data = await fourthwallFetch<{ results: FourthwallProduct[] }>({
      path: `collections/all/products?storefront_token=${STOREFRONT_TOKEN}&currency=${currency}&size=100`,
      tags: [TAGS.products],
      cache: "no-store",
    });

    logger.info(
      { operation: "get_products", count: data.results.length },
      "Found products"
    );
    return data.results.map(transformProduct);
  } catch (e) {
    logger.error(
      { error: sanitizeError(e), operation: "get_products" },
      "Error fetching products"
    );
    return [];
  }
}

export async function getProduct(
  slug: string,
  currency = "USD"
): Promise<Product | undefined> {
  if (!slug || slug === "undefined") {
    logger.warn(
      { operation: "get_product", slug },
      "getProduct called with invalid slug"
    );
    return undefined;
  }

  try {
    const data = await fourthwallFetch<FourthwallProduct>({
      path: `products/${slug}?storefront_token=${STOREFRONT_TOKEN}&currency=${currency}`,
      tags: [TAGS.products],
      cache: "no-store",
    });

    return transformProduct(data);
  } catch (e) {
    logger.error(
      { error: sanitizeError(e), operation: "get_product", slug },
      "Error fetching product"
    );
    return undefined;
  }
}

export async function createCart(): Promise<Cart> {
  const data = await fourthwallMutate<FourthwallCart>({
    path: `carts?storefront_token=${STOREFRONT_TOKEN}&currency=USD`,
    body: { items: [] },
  });

  return transformCart(data, "USD");
}

export async function getCart(
  cartId: string | undefined,
  currency = "USD"
): Promise<Cart | undefined> {
  if (!cartId) {
    return undefined;
  }

  try {
    const data = await fourthwallFetch<FourthwallCart>({
      path: `carts/${cartId}?storefront_token=${STOREFRONT_TOKEN}&currency=${currency}`,
      tags: [TAGS.cart],
      cache: "no-store",
    });

    return transformCart(data, currency);
  } catch {
    return undefined;
  }
}

export async function addToCart(
  cartId: string,
  lines: Array<{ merchandiseId: string; quantity: number }>
): Promise<Cart> {
  const data = await fourthwallMutate<FourthwallCart>({
    path: `carts/${cartId}/add?storefront_token=${STOREFRONT_TOKEN}&currency=USD`,
    body: {
      items: lines.map((line) => ({
        variantId: line.merchandiseId,
        quantity: line.quantity,
      })),
    },
  });

  return transformCart(data, "USD");
}

export async function updateCart(
  cartId: string,
  lines: Array<{ id: string; merchandiseId: string; quantity: number }>
): Promise<Cart> {
  const data = await fourthwallMutate<FourthwallCart>({
    path: `carts/${cartId}/change?storefront_token=${STOREFRONT_TOKEN}&currency=USD`,
    body: {
      items: lines.map((line) => ({
        variantId: line.merchandiseId,
        quantity: line.quantity,
      })),
    },
  });

  return transformCart(data, "USD");
}

export async function removeFromCart(
  cartId: string,
  lineIds: string[]
): Promise<Cart> {
  // Extract variant IDs from line IDs (format: variantId-cartId)
  const items = lineIds.map((lineId) => {
    const variantId = lineId.split("-")[0];
    return { variantId };
  });

  const data = await fourthwallMutate<FourthwallCart>({
    path: `carts/${cartId}/remove?storefront_token=${STOREFRONT_TOKEN}&currency=USD`,
    body: { items },
  });

  return transformCart(data, "USD");
}
