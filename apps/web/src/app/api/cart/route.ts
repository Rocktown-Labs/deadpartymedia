import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { addToCart, createCart, getCart, removeFromCart, updateCart } from "@/lib/fourthwall";

const DEFAULT_CURRENCY = "USD";

function getCheckoutUrl(cartId: string | undefined, currency: string) {
  const checkoutBase = process.env.NEXT_PUBLIC_FW_CHECKOUT;
  if (!checkoutBase || !cartId) {
    return null;
  }

  return `${checkoutBase}/checkout/?cartId=${cartId}&cartCurrency=${currency}`;
}

async function resolveCart(cartId: string | undefined, currency: string) {
  if (!cartId) {
    return null;
  }

  return getCart(cartId, currency);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const cartId = searchParams.get("cartId") ?? undefined;
  const currency = searchParams.get("currency") ?? DEFAULT_CURRENCY;
  const cart = await resolveCart(cartId, currency);

  return NextResponse.json({
    cart: cart ?? null,
    checkout_url: getCheckoutUrl(cart?.id, currency),
  });
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as {
    cartId?: string;
    currency?: string;
    merchandiseId?: string;
    quantity?: number;
  } | null;

  if (!body?.merchandiseId) {
    return NextResponse.json({ error: "merchandiseId is required" }, { status: 400 });
  }

  const currency = body.currency ?? DEFAULT_CURRENCY;
  const existingCart = (await resolveCart(body.cartId, currency)) ?? (await createCart());
  const quantity = Number.isFinite(body.quantity) ? Math.max(1, Math.trunc(body.quantity ?? 1)) : 1;
  const cart = await addToCart(existingCart.id ?? "", [
    { merchandiseId: body.merchandiseId, quantity },
  ]);

  return NextResponse.json({
    cart,
    checkout_url: getCheckoutUrl(cart.id, currency),
  });
}

export async function PATCH(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as {
    cartId?: string;
    currency?: string;
    merchandiseId?: string;
    quantity?: number;
  } | null;

  if (!body?.merchandiseId || !Number.isFinite(body.quantity)) {
    return NextResponse.json({ error: "merchandiseId and quantity are required" }, { status: 400 });
  }

  const currency = body.currency ?? DEFAULT_CURRENCY;
  const existingCart = (await resolveCart(body.cartId, currency)) ?? (await createCart());
  const nextQuantity = Math.max(0, Math.trunc(body.quantity ?? 0));
  let cart = existingCart;

  const matchingLine = existingCart.lines.find(
    (line) => line.merchandise.id === body.merchandiseId,
  );
  if (nextQuantity === 0 && matchingLine) {
    cart = await removeFromCart(existingCart.id ?? "", [matchingLine.id]);
  } else if (matchingLine) {
    cart = await updateCart(existingCart.id ?? "", [
      {
        id: matchingLine.id,
        merchandiseId: body.merchandiseId,
        quantity: nextQuantity,
      },
    ]);
  } else if (nextQuantity > 0) {
    cart = await addToCart(existingCart.id ?? "", [
      { merchandiseId: body.merchandiseId, quantity: nextQuantity },
    ]);
  }

  return NextResponse.json({
    cart,
    checkout_url: getCheckoutUrl(cart.id, currency),
  });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const cartId = searchParams.get("cartId") ?? undefined;
  const merchandiseId = searchParams.get("merchandiseId");
  const currency = searchParams.get("currency") ?? DEFAULT_CURRENCY;

  if (!cartId || !merchandiseId) {
    return NextResponse.json({ error: "cartId and merchandiseId are required" }, { status: 400 });
  }

  const existingCart = await resolveCart(cartId, currency);
  if (!existingCart) {
    return NextResponse.json({ cart: null, checkout_url: null });
  }

  const matchingLine = existingCart.lines.find((line) => line.merchandise.id === merchandiseId);
  const cart = matchingLine
    ? await removeFromCart(existingCart.id ?? "", [matchingLine.id])
    : existingCart;

  return NextResponse.json({
    cart,
    checkout_url: getCheckoutUrl(cart.id, currency),
  });
}
