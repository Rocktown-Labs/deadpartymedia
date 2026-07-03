import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const FOURTHWALL_API_URL =
  process.env.VITE_FW_API_URL ??
  process.env.NEXT_PUBLIC_FW_API_URL ??
  "https://storefront-api.fourthwall.com/v1";
const STOREFRONT_TOKEN =
  process.env.VITE_FW_STOREFRONT_TOKEN ?? process.env.NEXT_PUBLIC_FW_STOREFRONT_TOKEN;
const CHECKOUT_URL = process.env.VITE_FW_CHECKOUT ?? process.env.NEXT_PUBLIC_FW_CHECKOUT;
const ARTS_COLLECTION_ID =
  process.env.VITE_FW_ARTS_COLLECTION_ID ??
  process.env.NEXT_PUBLIC_FW_ARTS_COLLECTION_ID ??
  process.env.VITE_FOURTHWALL_ARTS_COLLECTION_ID ??
  process.env.NEXT_PUBLIC_FOURTHWALL_ARTS_COLLECTION_ID;

interface FourthwallProduct {
  id: string;
  name: string;
  slug: string;
  description?: string;
  images?: { url: string; transformedUrl?: string; width?: number; height?: number }[];
  variants?: {
    id: string;
    name: string;
    unitPrice: { value: number; currency: string };
    attributes?: {
      color?: { name: string; swatch?: string };
      size?: { name: string };
    };
    stock?: { type: "LIMITED" | "UNLIMITED"; inStock?: number };
    images?: { url: string; transformedUrl?: string }[];
  }[];
}

interface FourthwallCart {
  id: string;
  items?: {
    variant: NonNullable<FourthwallProduct["variants"]>[number] & {
      product: { id: string; name: string; slug: string };
    };
    quantity: number;
  }[];
}

export interface ArtsProduct {
  id: string;
  title: string;
  handle: string;
  description: string;
  image: string;
  availableForSale: boolean;
  minPrice: string;
  currency: string;
  variants: {
    id: string;
    title: string;
    availableForSale: boolean;
    price: string;
    currency: string;
    options: string[];
  }[];
}

export interface ArtsCart {
  id: string;
  lines: {
    id: string;
    merchandiseId: string;
    productTitle: string;
    variantTitle: string;
    image: string;
    quantity: number;
    total: string;
    currency: string;
  }[];
  totalQuantity: number;
  subtotal: string;
  currency: string;
  checkoutUrl: string | null;
}

const cartInputSchema = z.object({
  cartId: z.string().optional(),
});

const cartLineSchema = z.object({
  cartId: z.string().optional(),
  merchandiseId: z.string().min(1),
  quantity: z.number().int().min(0).max(99).default(1),
});

function fourthwallUrl(path: string) {
  const baseUrl = FOURTHWALL_API_URL.endsWith("/") ? FOURTHWALL_API_URL : `${FOURTHWALL_API_URL}/`;
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  return `${baseUrl}${cleanPath}`;
}

async function fourthwallFetch<T>(path: string, init?: RequestInit) {
  if (!STOREFRONT_TOKEN) {
    throw new Error("Fourthwall storefront token is not configured.");
  }

  const response = await fetch(fourthwallUrl(path), {
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.message ?? `Fourthwall request failed with ${response.status}`);
  }

  return payload as T;
}

function formatAmount(value: number | string) {
  return Number(value).toFixed(2);
}

function transformProduct(product: FourthwallProduct): ArtsProduct {
  const variants = product.variants ?? [];
  const prices = variants.map((variant) => Number(variant.unitPrice.value));
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const firstImage = product.images?.[0];
  const currency = variants[0]?.unitPrice.currency ?? "USD";

  return {
    availableForSale: variants.some(
      (variant) => variant.stock?.type === "UNLIMITED" || Number(variant.stock?.inStock ?? 0) > 0,
    ),
    currency,
    description: product.description ?? "",
    handle: product.slug,
    id: product.id,
    image: firstImage?.transformedUrl ?? firstImage?.url ?? "",
    minPrice: formatAmount(minPrice),
    title: product.name,
    variants: variants.map((variant) => ({
      availableForSale:
        variant.stock?.type === "UNLIMITED" || Number(variant.stock?.inStock ?? 0) > 0,
      currency: variant.unitPrice.currency,
      id: variant.id,
      options: [variant.attributes?.color?.name, variant.attributes?.size?.name].filter(
        (option): option is string => Boolean(option),
      ),
      price: formatAmount(variant.unitPrice.value),
      title: variant.name,
    })),
  };
}

function transformCart(cart: FourthwallCart, currency = "USD"): ArtsCart {
  const lines = (cart.items ?? []).map((item) => {
    const variant = item.variant;
    const total = Number(variant.unitPrice.value) * item.quantity;
    const image = variant.images?.[0]?.transformedUrl ?? variant.images?.[0]?.url ?? "";

    return {
      currency: variant.unitPrice.currency ?? currency,
      id: `${variant.id}-${cart.id}`,
      image,
      merchandiseId: variant.id,
      productTitle: variant.product.name,
      quantity: item.quantity,
      total: formatAmount(total),
      variantTitle: variant.name,
    };
  });
  const subtotal = lines.reduce((sum, line) => sum + Number(line.total), 0);

  return {
    checkoutUrl: CHECKOUT_URL
      ? `${CHECKOUT_URL.replace(/\/$/, "")}/checkout/?cartId=${cart.id}&cartCurrency=${currency}`
      : null,
    currency,
    id: cart.id,
    lines,
    subtotal: formatAmount(subtotal),
    totalQuantity: lines.reduce((sum, line) => sum + line.quantity, 0),
  };
}

async function createCart() {
  const cart = await fourthwallFetch<FourthwallCart>(
    `carts?storefront_token=${STOREFRONT_TOKEN}&currency=USD`,
    {
      body: JSON.stringify({ items: [] }),
      method: "POST",
    },
  );

  return transformCart(cart);
}

async function fetchCart(cartId: string) {
  const cart = await fourthwallFetch<FourthwallCart>(
    `carts/${cartId}?storefront_token=${STOREFRONT_TOKEN}&currency=USD`,
  );

  return transformCart(cart);
}

async function getOrCreateCart(cartId?: string) {
  if (cartId) {
    const existing = await fetchCart(cartId).catch(() => null);
    if (existing) {
      return existing;
    }
  }

  return createCart();
}

export const getArtsProducts = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const collectionPath = ARTS_COLLECTION_ID
      ? `collections/${ARTS_COLLECTION_ID}/products`
      : "collections/all/products";
    const data = await fourthwallFetch<{ results: FourthwallProduct[] }>(
      `${collectionPath}?storefront_token=${STOREFRONT_TOKEN}&currency=USD&size=24`,
    );

    return data.results.map(transformProduct);
  } catch {
    return [] satisfies ArtsProduct[];
  }
});

export const getArtsCart = createServerFn({ method: "GET" })
  .validator(cartInputSchema)
  .handler(async ({ data }) => {
    if (!data.cartId) {
      return null;
    }

    return fetchCart(data.cartId);
  });

export const addArtsCartItem = createServerFn({ method: "POST" })
  .validator(cartLineSchema)
  .handler(async ({ data }) => {
    const cart = await getOrCreateCart(data.cartId);
    const updated = await fourthwallFetch<FourthwallCart>(
      `carts/${cart.id}/add?storefront_token=${STOREFRONT_TOKEN}&currency=USD`,
      {
        body: JSON.stringify({
          items: [{ quantity: data.quantity || 1, variantId: data.merchandiseId }],
        }),
        method: "POST",
      },
    );

    return transformCart(updated);
  });

export const updateArtsCartItem = createServerFn({ method: "POST" })
  .validator(cartLineSchema)
  .handler(async ({ data }) => {
    const cart = await getOrCreateCart(data.cartId);
    const endpoint = data.quantity === 0 ? "remove" : "change";
    const updated = await fourthwallFetch<FourthwallCart>(
      `carts/${cart.id}/${endpoint}?storefront_token=${STOREFRONT_TOKEN}&currency=USD`,
      {
        body: JSON.stringify({
          items: [{ quantity: data.quantity, variantId: data.merchandiseId }],
        }),
        method: "POST",
      },
    );

    return transformCart(updated);
  });
