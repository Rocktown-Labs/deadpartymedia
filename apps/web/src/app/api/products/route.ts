import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getProducts } from "@/lib/fourthwall";

const DEFAULT_PRODUCT_LIMIT = 100;
const MAX_PRODUCT_LIMIT = 100;
const DEFAULT_CURRENCY = "USD";

function parseLimit(value: string | null): number {
  if (!value) {
    return DEFAULT_PRODUCT_LIMIT;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return DEFAULT_PRODUCT_LIMIT;
  }

  return Math.min(parsed, MAX_PRODUCT_LIMIT);
}

function parseCurrency(value: string | null): string {
  if (!value) {
    return DEFAULT_CURRENCY;
  }

  const normalized = value.trim().toUpperCase();
  if (normalized.length !== 3) {
    return DEFAULT_CURRENCY;
  }

  return normalized;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const currency = parseCurrency(searchParams.get("currency"));
  const limit = parseLimit(searchParams.get("limit"));

  const products = await getProducts(currency, limit);

  return NextResponse.json(products, {
    headers: {
      "Cache-Control": "public, max-age=0, s-maxage=86400, stale-while-revalidate=86400",
    },
  });
}
