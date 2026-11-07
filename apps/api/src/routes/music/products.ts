import { Hono } from "hono";
import { getProducts } from "../../lib/fourthwall";
import type { AppEnv } from "../../bindings";

/**
 * Ported from apps/web/src/app/api/products/route.ts (Fourthwall proxy).
 * Response shape is identical to the Next.js route.
 */
export const musicProductsRoutes = new Hono<AppEnv>();

const DEFAULT_PRODUCT_LIMIT = 100;
const MAX_PRODUCT_LIMIT = 100;
const DEFAULT_CURRENCY = "USD";

function parseLimit(value: string | undefined): number {
  if (!value) {
    return DEFAULT_PRODUCT_LIMIT;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return DEFAULT_PRODUCT_LIMIT;
  }

  return Math.min(parsed, MAX_PRODUCT_LIMIT);
}

function parseCurrency(value: string | undefined): string {
  if (!value) {
    return DEFAULT_CURRENCY;
  }

  const normalized = value.trim().toUpperCase();
  if (normalized.length !== 3) {
    return DEFAULT_CURRENCY;
  }

  return normalized;
}

musicProductsRoutes.get("/", async (c) => {
  const currency = parseCurrency(c.req.query("currency"));
  const limit = parseLimit(c.req.query("limit"));

  const products = await getProducts(c.env, currency, limit);

  return c.json(products, 200, {
    "Cache-Control": "public, max-age=0, s-maxage=86400, stale-while-revalidate=86400",
  });
});
