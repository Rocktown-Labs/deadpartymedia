import { NextResponse } from "next/server";
import { connection } from "next/server";
import { getCartId } from "@/app/cart/actions";
import { getCart } from "@/lib/fourthwall";
import { logger } from "@/lib/logger";
import { sanitizeError } from "@/lib/logger/sanitize";

export async function GET() {
  await connection();

  try {
    const cartId = await getCartId();
    if (!cartId) {
      return NextResponse.json(null, {
        headers: {
          "Cache-Control": "private, no-store",
        },
      });
    }

    const cart = await getCart(cartId, "USD");
    return NextResponse.json(cart ?? null, {
      headers: {
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    logger.error(
      { error: sanitizeError(error), operation: "hydrate_cart" },
      "Error hydrating cart",
    );
    return NextResponse.json(null, {
      headers: {
        "Cache-Control": "private, no-store",
      },
    });
  }
}
