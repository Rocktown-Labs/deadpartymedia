import { afterEach, describe, expect, it } from "vite-plus/test";
import { Hono } from "hono";
import { musicProductsRoutes } from "../src/routes/music/products";
import type { AppEnv } from "../src/bindings";

/**
 * Fourthwall proxy fidelity. `fetch` is stubbed so nothing leaves the
 * process: these tests lock the request URL building and the transformed
 * response shape + Cache-Control header of the source route
 * (apps/web/src/app/api/products/route.ts + lib/fourthwall.ts).
 */
const env = {
  DATABASE_URL: "",
  CLERK_SECRET_KEY: "sk_test_missing",
  CLERK_PUBLISHABLE_KEY: "",
  FW_API_URL: "https://storefront-api.fourthwall.com/v1",
  FW_STOREFRONT_TOKEN: "tok_test",
};

const realFetch = globalThis.fetch;
let fetchCalls: string[] = [];

afterEach(() => {
  globalThis.fetch = realFetch;
  fetchCalls = [];
});

function stubFetch(body: unknown): void {
  globalThis.fetch = (async (input: unknown) => {
    fetchCalls.push(String(input));
    return new Response(JSON.stringify(body), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  }) as typeof fetch;
}

function productsApp() {
  const music = new Hono<AppEnv>();
  music.route("/products", musicProductsRoutes);
  const app = new Hono<AppEnv>();
  app.route("/music", music);
  return app;
}

const fourthwallProduct = {
  id: "prod_1",
  name: "Test Tee",
  slug: "test-tee",
  description: "A test tee",
  images: [
    {
      url: "https://img.example/original.jpg",
      transformedUrl: "https://img.example/transformed.jpg",
      width: 1200,
      height: 1600,
    },
  ],
  variants: [
    {
      id: "var_1",
      name: "Black S",
      sku: "TEE-S",
      unitPrice: { value: 19.99, currency: "USD" },
      attributes: {
        description: "Black Small",
        color: { name: "Black", swatch: "#000000" },
        size: { name: "S" },
      },
      stock: { type: "LIMITED", inStock: 3 },
      images: [
        {
          url: "https://img.example/v-original.jpg",
          transformedUrl: "https://img.example/v-transformed.jpg",
        },
      ],
    },
  ],
};

describe("GET /music/products", () => {
  it("proxies to Fourthwall with the source URL building and sets the source Cache-Control header", async () => {
    stubFetch({ results: [] });

    const app = productsApp();
    const response = await app.request("/music/products?currency=usd&limit=5", {}, env);

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe(
      "public, max-age=0, s-maxage=86400, stale-while-revalidate=86400",
    );
    expect(await response.json()).toEqual([]);
    expect(fetchCalls).toEqual([
      "https://storefront-api.fourthwall.com/v1/collections/all/products?storefront_token=tok_test&currency=USD&size=5",
    ]);
  });

  it("transforms Fourthwall products into the source response shape", async () => {
    stubFetch({ results: [fourthwallProduct] });

    const app = productsApp();
    const response = await app.request("/music/products", {}, env);

    expect(response.status).toBe(200);
    const [product] = (await response.json()) as Array<Record<string, unknown>>;
    if (!product) {
      throw new Error("expected a transformed product");
    }
    expect(product.id).toBe("prod_1");
    expect(product.handle).toBe("test-tee");
    expect(product.title).toBe("Test Tee");
    expect(product.description).toBe("A test tee");
    expect(product.descriptionHtml).toBe("A test tee");
    expect(product.availableForSale).toBe(true);
    expect(product.featuredImage).toEqual({
      altText: "Test Tee",
      height: 1600,
      url: "https://img.example/transformed.jpg",
      width: 1200,
    });
    expect(product.priceRange).toEqual({
      maxVariantPrice: { amount: "19.99", currencyCode: "USD" },
      minVariantPrice: { amount: "19.99", currencyCode: "USD" },
    });
    expect(product.options).toEqual([
      { id: "color", name: "Color", values: ["Black"] },
      { id: "size", name: "Size", values: ["S"] },
    ]);
    expect(product.variants).toEqual([
      {
        availableForSale: true,
        id: "var_1",
        images: [
          {
            altText: "Test Tee",
            height: 800,
            url: "https://img.example/v-transformed.jpg",
            width: 800,
          },
        ],
        price: { amount: "19.99", currencyCode: "USD" },
        selectedOptions: [
          { name: "Size", value: "S" },
          { name: "Color", value: "Black" },
        ],
        title: "Black S",
      },
    ]);
  });
});
