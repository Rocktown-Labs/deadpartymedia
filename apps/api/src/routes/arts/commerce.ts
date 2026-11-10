import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import { firstIssueMessage, invalid } from "../../lib/arts-errors";

import { cartInputSchema, cartLineSchema } from "../../lib/arts-schemas";

import type { AppEnv, Bindings } from "../../bindings";

const FOURTHWALL_API_URL_FALLBACK = "https://storefront-api.fourthwall.com/v1";

interface FourthwallEnv {
  apiBaseUrl: string;
  storefrontToken: string | undefined;
  checkoutUrl: string | undefined;
  artsCollectionId: string | undefined;
}

function fourthwallConfig(env: Bindings): FourthwallEnv {
  return {
    apiBaseUrl: env.FW_API_URL ?? FOURTHWALL_API_URL_FALLBACK,
    storefrontToken: env.FW_STOREFRONT_TOKEN,
    checkoutUrl: env.FW_CHECKOUT_URL,
    artsCollectionId: env.FW_ARTS_COLLECTION_ID,
  };
}

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
  images: string[];
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

function fourthwallUrl(baseUrl: string, path: string) {
  const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  return `${normalizedBaseUrl}${cleanPath}`;
}

async function fourthwallFetch<T>(fw: FourthwallEnv, path: string, init?: RequestInit): Promise<T> {
  if (!fw.storefrontToken) {
    throw new Error("Fourthwall storefront token is not configured.");
  }

  // The source passed `cache: "no-store"` — omitted here because Workers
  // fetch has no HTTP cache (the directive would be a no-op), matching the
  // lib/fourthwall.ts port.
  const response = await fetch(fourthwallUrl(fw.apiBaseUrl, path), {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      (payload as { message?: string } | null)?.message ??
        `Fourthwall request failed with ${response.status}`,
    );
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

  const allImages = (product.images ?? [])
    .map((img) => img.transformedUrl ?? img.url ?? "")
    .filter(Boolean);
  if (allImages.length === 0 && firstImage) {
    const mainImg = firstImage.transformedUrl ?? firstImage.url ?? "";
    if (mainImg) {
      allImages.push(mainImg);
    }
  }

  return {
    availableForSale: variants.some(
      (variant) => variant.stock?.type === "UNLIMITED" || Number(variant.stock?.inStock ?? 0) > 0,
    ),
    currency,
    description: product.description ?? "",
    handle: product.slug,
    id: product.id,
    image: firstImage?.transformedUrl ?? firstImage?.url ?? "",
    images: allImages,
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

function transformCart(cart: FourthwallCart, fw: FourthwallEnv, currency = "USD"): ArtsCart {
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
    checkoutUrl: fw.checkoutUrl
      ? `${fw.checkoutUrl.replace(/\/$/, "")}/checkout/?cartId=${cart.id}&cartCurrency=${currency}`
      : null,
    currency,
    id: cart.id,
    lines,
    subtotal: formatAmount(subtotal),
    totalQuantity: lines.reduce((sum, line) => sum + line.quantity, 0),
  };
}

async function createCart(fw: FourthwallEnv) {
  const cart = await fourthwallFetch<FourthwallCart>(
    fw,
    `carts?storefront_token=${fw.storefrontToken}&currency=USD`,
    {
      body: JSON.stringify({ items: [] }),
      method: "POST",
    },
  );

  return transformCart(cart, fw);
}

async function fetchCart(fw: FourthwallEnv, cartId: string) {
  const cart = await fourthwallFetch<FourthwallCart>(
    fw,
    `carts/${cartId}?storefront_token=${fw.storefrontToken}&currency=USD`,
  );

  return transformCart(cart, fw);
}

async function getOrCreateCart(fw: FourthwallEnv, cartId?: string) {
  if (cartId) {
    const existing = await fetchCart(fw, cartId).catch(() => null);
    if (existing) {
      return existing;
    }
  }

  return createCart(fw);
}

export const artsCommerceRoutes = new Hono<AppEnv>()
  .get("/products", async (c) => {
    const fw = fourthwallConfig(c.env);
    try {
      const collectionPath = fw.artsCollectionId
        ? `collections/${fw.artsCollectionId}/products`
        : "collections/all/products";
      const data = await fourthwallFetch<{ results: FourthwallProduct[] }>(
        fw,
        `${collectionPath}?storefront_token=${fw.storefrontToken}&currency=USD&size=24`,
      );

      return c.json(data.results.map(transformProduct));
    } catch {
      return c.json([] satisfies ArtsProduct[]);
    }
  })
  .get("/products/:handle", async (c) => {
    const handle = c.req.param("handle");
    if (!handle) {
      return c.json(null);
    }

    const fw = fourthwallConfig(c.env);
    try {
      const product = await fourthwallFetch<FourthwallProduct>(
        fw,
        `products/${handle}?storefront_token=${fw.storefrontToken}&currency=USD`,
      );
      return c.json(transformProduct(product));
    } catch {
      return c.json(null);
    }
  })
  .get("/cart", async (c) => {
    let input: unknown = {};
    const queryCartId = c.req.query("cartId");
    if (queryCartId !== undefined) {
      input = { cartId: queryCartId };
    } else {
      try {
        input = await c.req.json();
      } catch {
        input = {};
      }
    }

    const parsed = cartInputSchema.safeParse(input);
    if (!parsed.success) {
      throw invalid(firstIssueMessage(parsed.error));
    }
    if (!parsed.data.cartId) {
      return c.json(null);
    }

    return c.json(await fetchCart(fourthwallConfig(c.env), parsed.data.cartId));
  })
  .post("/cart/items", zValidator("json", cartLineSchema), async (c) => {
    const data = c.req.valid("json");

    const fw = fourthwallConfig(c.env);
    const cart = await getOrCreateCart(fw, data.cartId);
    const updated = await fourthwallFetch<FourthwallCart>(
      fw,
      `carts/${cart.id}/add?storefront_token=${fw.storefrontToken}&currency=USD`,
      {
        body: JSON.stringify({
          items: [{ quantity: data.quantity || 1, variantId: data.merchandiseId }],
        }),
        method: "POST",
      },
    );

    return c.json(transformCart(updated, fw));
  })
  .patch("/cart/items", zValidator("json", cartLineSchema), async (c) => {
    const data = c.req.valid("json");

    const fw = fourthwallConfig(c.env);
    const cart = await getOrCreateCart(fw, data.cartId);
    const endpoint = data.quantity === 0 ? "remove" : "change";
    const updated = await fourthwallFetch<FourthwallCart>(
      fw,
      `carts/${cart.id}/${endpoint}?storefront_token=${fw.storefrontToken}&currency=USD`,
      {
        body: JSON.stringify({
          items: [{ quantity: data.quantity, variantId: data.merchandiseId }],
        }),
        method: "POST",
      },
    );

    return c.json(transformCart(updated, fw));
  });
