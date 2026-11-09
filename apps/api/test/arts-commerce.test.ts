import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { Hono } from "hono";
import { artsCommerceRoutes } from "../src/routes/arts/commerce";
import type { AppEnv } from "../src/bindings";

const env = {
  DATABASE_URL: "",
  CLERK_SECRET_KEY: "sk_test_missing",
  CLERK_PUBLISHABLE_KEY: "",
  FW_STOREFRONT_TOKEN: "test-storefront-token",
};

const PRODUCTS_URL =
  "https://storefront-api.fourthwall.com/v1/collections/all/products?storefront_token=test-storefront-token&currency=USD&size=24";

// The port omits the source's `cache: "no-store"` directive (Workers fetch
// has no HTTP cache), so the GET init is just the content-type header.
const GET_INIT = {
  headers: { "Content-Type": "application/json" },
};

// Minimal Fourthwall product payload crafted to exercise every branch of
// the ported transformProduct: min price, transformed image URLs, color +
// size options, and LIMITED stock.
const fourthwallProduct = {
  id: "prod_123",
  name: "Little Rock Print",
  slug: "little-rock-print",
  description: "A print.",
  images: [
    {
      url: "https://cdn.example.com/original.jpg",
      transformedUrl: "https://cdn.example.com/transformed.jpg",
      width: 800,
      height: 600,
    },
  ],
  variants: [
    {
      id: "var_456",
      name: '8" x 10"',
      unitPrice: { value: 40, currency: "USD" },
      attributes: { color: { name: "Midnight" }, size: { name: '8" x 10"' } },
      stock: { type: "LIMITED", inStock: 2 },
      images: [{ url: "https://cdn.example.com/original.jpg" }],
    },
  ],
};

// The ArtsProduct shape getArtsProducts returned to the arts frontend.
const expectedArtsProduct = {
  id: "prod_123",
  title: "Little Rock Print",
  handle: "little-rock-print",
  description: "A print.",
  image: "https://cdn.example.com/transformed.jpg",
  images: ["https://cdn.example.com/transformed.jpg"],
  availableForSale: true,
  minPrice: "40.00",
  currency: "USD",
  variants: [
    {
      id: "var_456",
      title: '8" x 10"',
      availableForSale: true,
      price: "40.00",
      currency: "USD",
      options: ["Midnight", '8" x 10"'],
    },
  ],
};

function jsonResponse(payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

function commerceApp() {
  const app = new Hono<AppEnv>();
  app.route("/arts", artsCommerceRoutes);
  return app;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("GET /arts/products", () => {
  it("returns the source's transformed ArtsProduct shape for a minimal Fourthwall product", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ results: [fourthwallProduct] }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await commerceApp().request("/arts/products", {}, env);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([expectedArtsProduct]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(PRODUCTS_URL, GET_INIT);
  });

  it("falls back to [] when the Fourthwall payload has no results array", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(JSON.stringify({ some: "products" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }),
    );

    const response = await commerceApp().request("/arts/products", {}, env);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);
  });

  it("targets the configured arts collection when FW_ARTS_COLLECTION_ID is set", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ results: [] }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await commerceApp().request(
      "/arts/products",
      {},
      { ...env, FW_ARTS_COLLECTION_ID: "col_arts" },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://storefront-api.fourthwall.com/v1/collections/col_arts/products?storefront_token=test-storefront-token&currency=USD&size=24",
      GET_INIT,
    );
  });
});
