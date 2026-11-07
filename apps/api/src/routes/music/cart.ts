import { Hono } from "hono";
import type { AppEnv, Bindings } from "../../bindings";

/**
 * Ported from apps/web/src/app/cart/actions.ts + lib/fourthwall.ts — the
 * music storefront's Fourthwall cart. The Next server actions kept the cart
 * id in a cookie; the API is stateless (cartId in, cartId out) so any
 * frontend can hold it (cookie or localStorage) — same mechanics, same
 * Fourthwall endpoints (carts / carts/:id/add /change /remove).
 *
 * FW bindings: FW_API_URL (default https://storefront-api.fourthwall.com/v1),
 * FW_STOREFRONT_TOKEN, FW_CHECKOUT_URL — the NEXT_PUBLIC_FW_* equivalents.
 */
export const musicCartRoutes = new Hono<AppEnv>();

interface FwLine {
  id?: string;
  merchandise?: { id?: string };
  quantity?: number;
  title?: string;
  price?: { amount?: string; currencyCode?: string };
}

interface FwCart {
  id?: string;
  lines?: FwLine[];
  subtotal?: { amount?: string; currencyCode?: string };
}

interface ApiCart {
  id: string;
  lines: { id: string; merchandiseId: string; quantity: number; title: string | null }[];
  subtotal: string | null;
}

function apiBase(env: Bindings): string {
  return (env.FW_API_URL || "https://storefront-api.fourthwall.com/v1").replace(/\/$/, "");
}

function token(env: Bindings): string {
  return env.FW_STOREFRONT_TOKEN || "undefined";
}

function transformCart(cart: FwCart): ApiCart {
  return {
    id: cart.id ?? "",
    lines: (cart.lines ?? []).map((line) => ({
      id: line.id ?? "",
      merchandiseId: line.merchandise?.id ?? "",
      quantity: line.quantity ?? 0,
      title: line.title ?? null,
    })),
    subtotal: cart.subtotal?.amount
      ? `${cart.subtotal.currencyCode ?? "USD"} ${cart.subtotal.amount}`
      : null,
  };
}

async function fwFetch<T>(env: Bindings, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBase(env)}/${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
  });
  if (!response.ok) {
    throw new Error(`Fourthwall ${response.status} ${path.split("?")[0]}`);
  }
  return (await response.json()) as T;
}

async function fetchCart(env: Bindings, cartId: string): Promise<ApiCart | null> {
  try {
    const data = await fwFetch<FwCart>(
      env,
      `carts/${cartId}?storefront_token=${token(env)}&currency=USD`,
    );
    return transformCart(data);
  } catch {
    return null;
  }
}

async function createCart(env: Bindings): Promise<ApiCart> {
  const data = await fwFetch<FwCart>(env, `carts?storefront_token=${token(env)}&currency=USD`, {
    body: JSON.stringify({ items: [] }),
    method: "POST",
  });
  return transformCart(data);
}

async function mutateCart(
  env: Bindings,
  cartId: string,
  action: "add" | "change" | "remove",
  items: { variantId: string; quantity?: number }[],
): Promise<ApiCart> {
  const data = await fwFetch<FwCart>(
    env,
    `carts/${cartId}/${action}?storefront_token=${token(env)}&currency=USD`,
    {
      body: JSON.stringify({ items }),
      method: "POST",
    },
  );
  return transformCart(data);
}

async function ensureCart(env: Bindings, cartId: string | undefined): Promise<ApiCart> {
  if (cartId) {
    const existing = await fetchCart(env, cartId);
    if (existing) {
      return existing;
    }
  }
  return createCart(env);
}

musicCartRoutes.get("/cart", async (c) => {
  const cartId = c.req.query("cartId");
  if (!cartId) {
    return c.json(null);
  }
  return c.json(await fetchCart(c.env, cartId));
});

musicCartRoutes.post("/cart/items", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as {
    cartId?: string;
    merchandiseId?: string;
    quantity?: number;
  };
  const merchandiseId = body.merchandiseId;
  const quantity = body.quantity ?? 1;
  if (!merchandiseId) {
    return c.json({ error: "merchandiseId is required" }, 400);
  }

  try {
    const cart = await ensureCart(c.env, body.cartId);
    const updated = await mutateCart(c.env, cart.id, "add", [
      { quantity, variantId: merchandiseId },
    ]);
    return c.json({ cart: updated, cartId: updated.id });
  } catch (error) {
    console.error("[api] add_cart_item:", error);
    return c.json({ error: "Error adding item to cart" }, 502);
  }
});

musicCartRoutes.patch("/cart/items", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as {
    cartId?: string;
    merchandiseId?: string;
    quantity?: number;
  };
  const { cartId, merchandiseId } = body;
  const quantity = body.quantity ?? 0;
  if (!cartId || !merchandiseId) {
    return c.json({ error: "cartId and merchandiseId are required" }, 400);
  }

  try {
    const cart = await fetchCart(c.env, cartId);
    if (!cart) {
      return c.json({ error: "Error fetching cart" }, 404);
    }
    const line = cart.lines.find((item) => item.merchandiseId === merchandiseId);

    if (line) {
      // Fourthwall line ids are "<variantId>-<cartId>"; the remove call
      // wants the variantId prefix (same as the web client's helper).
      const variantId = line.id.split("-")[0] || merchandiseId;
      const updated =
        quantity === 0
          ? await mutateCart(c.env, cartId, "remove", [{ variantId }])
          : await mutateCart(c.env, cartId, "change", [{ quantity, variantId: merchandiseId }]);
      return c.json({ cart: updated });
    }

    if (quantity > 0) {
      const updated = await mutateCart(c.env, cartId, "add", [
        { quantity, variantId: merchandiseId },
      ]);
      return c.json({ cart: updated });
    }
    return c.json({ cart });
  } catch (error) {
    console.error("[api] update_cart_item:", error);
    return c.json({ error: "Error updating item quantity" }, 502);
  }
});

musicCartRoutes.delete("/cart/items", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as {
    cartId?: string;
    merchandiseId?: string;
  };
  const { cartId, merchandiseId } = body;
  if (!cartId || !merchandiseId) {
    return c.json({ error: "cartId and merchandiseId are required" }, 400);
  }

  try {
    const cart = await fetchCart(c.env, cartId);
    if (!cart) {
      return c.json({ error: "Error fetching cart" }, 404);
    }
    const line = cart.lines.find((item) => item.merchandiseId === merchandiseId);
    if (!line) {
      return c.json({ error: "Item not found in cart" }, 404);
    }
    const variantId = line.id.split("-")[0] || merchandiseId;
    const updated = await mutateCart(c.env, cartId, "remove", [{ variantId }]);
    return c.json({ cart: updated });
  } catch (error) {
    console.error("[api] remove_cart_item:", error);
    return c.json({ error: "Error removing item from cart" }, 502);
  }
});

musicCartRoutes.get("/cart/checkout-url", async (c) => {
  const cartId = c.req.query("cartId");
  const checkoutBase = c.env.FW_CHECKOUT_URL;
  if (!cartId || !checkoutBase) {
    return c.json({ error: "Missing cart id or checkout configuration" }, 400);
  }
  return c.json({
    checkoutUrl: `${checkoutBase.replace(/\/$/, "")}/checkout/?cartId=${cartId}&cartCurrency=USD`,
  });
});
