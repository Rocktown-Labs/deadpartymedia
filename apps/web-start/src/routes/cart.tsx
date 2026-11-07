import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiDelete, apiGet, apiPatch, getCartId } from "../lib/api-client";

interface CartLine {
  id: string;
  merchandiseId: string;
  quantity: number;
  title: string | null;
}

interface Cart {
  id: string;
  lines: CartLine[];
  subtotal: string | null;
}

/**
 * Ported from apps/web/src/app/cart — the cart id lives in the
 * `dead-party-cart-id` cookie (same key as the Next app) and all cart
 * operations go through the platform API's Fourthwall proxy.
 */
export const Route = createFileRoute("/cart")({
  component: CartPage,
  head: () => ({ meta: [{ title: "Cart | Dead Party Media" }] }),
});

function CartPage() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const cartId = getCartId();
    if (!cartId) {
      setCart(null);
      return;
    }
    const result = await apiGet<Cart | null>(`/music/cart?cartId=${encodeURIComponent(cartId)}`);
    setCart(result.ok ? (result.data ?? null) : null);
    if (!result.ok) {
      setError(result.error ?? null);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function update(line: CartLine, quantity: number) {
    setBusy(true);
    const cartId = getCartId();
    if (!cartId) {
      return;
    }
    const result = await apiPatch<{ cart: Cart }>("/music/cart/items", {
      cartId,
      merchandiseId: line.merchandiseId,
      quantity,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? "Could not update cart");
      return;
    }
    setCart(result.data?.cart ?? null);
  }

  async function remove(line: CartLine) {
    setBusy(true);
    const cartId = getCartId();
    if (!cartId) {
      return;
    }
    const result = await apiDelete<{ cart: Cart }>("/music/cart/items", {
      cartId,
      merchandiseId: line.merchandiseId,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? "Could not remove item");
      return;
    }
    setCart(result.data?.cart ?? null);
  }

  async function checkout() {
    const cartId = getCartId();
    if (!cartId) {
      return;
    }
    const result = await apiGet<{ checkoutUrl: string }>(
      `/music/cart/checkout-url?cartId=${encodeURIComponent(cartId)}`,
    );
    if (!result.ok || !result.data?.checkoutUrl) {
      setError(result.error ?? "Checkout unavailable");
      return;
    }
    window.location.href = result.data.checkoutUrl;
  }

  return (
    <main className="mx-auto max-w-2xl px-6 pt-28 pb-20">
      <h1 className="mb-6 text-4xl font-black">Your Cart</h1>

      {error ? (
        <p className="mb-6 rounded-md border border-red-500/40 px-4 py-3 text-sm text-red-400">
          {error}
        </p>
      ) : null}

      {!cart || cart.lines.length === 0 ? (
        <p className="text-gray-400">Your cart is empty.</p>
      ) : (
        <div className="space-y-4">
          <ul className="space-y-3">
            {cart.lines.map((line) => (
              <li
                className="flex items-center justify-between rounded-md border border-white/10 px-4 py-3"
                key={line.id}
              >
                <div>
                  <p className="font-semibold">{line.title ?? line.merchandiseId}</p>
                  <p className="text-xs text-gray-500">Qty {line.quantity}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    disabled={busy}
                    onClick={() => {
                      void update(line, line.quantity - 1);
                    }}
                    size="icon"
                    variant="ghost"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Button
                    disabled={busy}
                    onClick={() => {
                      void update(line, line.quantity + 1);
                    }}
                    size="icon"
                    variant="ghost"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button
                    disabled={busy}
                    onClick={() => {
                      void remove(line);
                    }}
                    size="icon"
                    variant="ghost"
                  >
                    <Trash2 className="h-4 w-4 text-red-400" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>

          {cart.subtotal ? (
            <p className="text-right text-lg font-bold text-[#7CFC00]">{cart.subtotal}</p>
          ) : null}

          <Button
            className="w-full bg-[#7CFC00] text-black hover:bg-[#7CFC00]/90"
            disabled={busy}
            onClick={() => {
              void checkout();
            }}
          >
            Checkout
          </Button>
        </div>
      )}
    </main>
  );
}
