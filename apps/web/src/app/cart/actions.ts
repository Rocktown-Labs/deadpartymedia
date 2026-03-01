"use server";

import { addToCart, createCart, getCart, removeFromCart, updateCart } from "@/lib/fourthwall";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { logger } from "@/lib/logger";
import { sanitizeError } from "@/lib/logger/sanitize";

const CART_COOKIE_KEY = "dead-party-cart-id";

export async function getCartId(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(CART_COOKIE_KEY)?.value;
}

async function setCartId(cartId: string) {
  const cookieStore = await cookies();
  cookieStore.set(CART_COOKIE_KEY, cartId);
}

export async function createCartAndSetCookie() {
  const cart = await createCart();
  await setCartId(cart.id!);
  return cart;
}

export async function addItem(prevState: any, selectedVariantId: string | undefined) {
  try {
    const cart = (await getCart(await getCartId(), "USD")) || (await createCartAndSetCookie());
    const cartId = cart.id!;

    if (!cart || !selectedVariantId) {
      return "Error adding item to cart";
    }

    await addToCart(cartId, [{ merchandiseId: selectedVariantId, quantity: 1 }]);
    revalidatePath("/");
  } catch {
    return "Error adding item to cart";
  }
}

export async function removeItem(prevState: any, merchandiseId: string) {
  try {
    const cart = (await getCart(await getCartId(), "USD")) || (await createCartAndSetCookie());
    const cartId = cart.id!;

    if (!cart) {
      return "Error fetching cart";
    }

    const lineItem = cart.lines.find((line) => line.merchandise.id === merchandiseId);

    if (lineItem && lineItem.id) {
      await removeFromCart(cartId, [lineItem.id]);
      revalidatePath("/");
    } else {
      return "Item not found in cart";
    }
  } catch {
    return "Error removing item from cart";
  }
}

export async function updateItemQuantity(
  prevState: any,
  payload: {
    merchandiseId: string;
    quantity: number;
  },
) {
  const { merchandiseId, quantity } = payload;

  try {
    const cart = (await getCart(await getCartId(), "USD")) || (await createCartAndSetCookie());
    const cartId = cart.id!;

    if (!cart) {
      return "Error fetching cart";
    }

    const lineItem = cart.lines.find((line) => line.merchandise.id === merchandiseId);

    if (lineItem && lineItem.id) {
      if (quantity === 0) {
        await removeFromCart(cartId, [lineItem.id]);
      } else {
        await updateCart(cartId, [
          {
            id: lineItem.id,
            merchandiseId,
            quantity,
          },
        ]);
      }
    } else if (quantity > 0) {
      await addToCart(cartId, [{ merchandiseId, quantity }]);
    }

    revalidatePath("/");
  } catch (error) {
    logger.error(
      { error: sanitizeError(error), operation: "update_cart_item_quantity" },
      "Error updating item quantity",
    );
    return "Error updating item quantity";
  }
}

export async function redirectToCheckout(_currency: string): Promise<void> {
  const CHECKOUT_URL = process.env.NEXT_PUBLIC_FW_CHECKOUT;
  const cartId = await getCartId();

  if (!cartId) {
    logger.error({ operation: "redirect_to_checkout" }, "Missing cart ID");
    return;
  }

  if (!CHECKOUT_URL) {
    logger.error({ operation: "redirect_to_checkout" }, "Missing checkout URL configuration");
    return;
  }

  const cart = await getCart(cartId, "USD");

  if (!cart) {
    logger.error({ cartId, operation: "redirect_to_checkout" }, "Error fetching cart");
    return;
  }

  const checkoutUrl: string = `${CHECKOUT_URL}/checkout/?cartId=${cartId}&cartCurrency=USD`;
  redirect(checkoutUrl as any);
}
