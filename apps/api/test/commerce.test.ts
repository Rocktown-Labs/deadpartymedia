import { env } from "cloudflare:test";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { commerce } from "../src/lib/music/commerce";
describe("native Fourthwall transport", () => {
  afterEach(() => vi.restoreAllMocks());
  it("returns merchandise under the Workers fetch cache contract", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (_input, init) => {
      if (init?.cache && !["no-store", "no-cache"].includes(init.cache))
        throw new TypeError(`Unsupported cache mode: ${init.cache}`);
      return Response.json({
        results: [
          {
            id: "product-1",
            name: "Shirt",
            slug: "shirt",
            description: "<p>Arkansas</p>",
            images: [],
            variants: [
              {
                id: "variant-1",
                name: "Default",
                sku: "SHIRT",
                unitPrice: { value: 20, currency: "USD" },
                attributes: { description: "Default" },
                stock: { type: "UNLIMITED" },
                images: [],
              },
            ],
          },
        ],
      });
    });
    const products = await commerce({ ...env, FW_STOREFRONT_TOKEN: "fixture-only" }).getProducts();
    expect(products).toHaveLength(1);
    expect(products[0]?.handle).toBe("shirt");
    expect(products[0]?.variants[0]?.availableForSale).toBe(true);
  });
  it("preserves whole provider variant IDs when removing a cart line", async () => {
    const transport = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(Response.json({ id: "cart-with-hyphens", items: [] }));
    const cart = await commerce({ ...env, FW_STOREFRONT_TOKEN: "fixture-only" }).removeFromCart(
      "cart-with-hyphens",
      ["variant-with-hyphens"],
    );
    expect(cart.lines).toEqual([]);
    expect(JSON.parse(String(transport.mock.calls[0]?.[1]?.body))).toEqual({
      items: [{ variantId: "variant-with-hyphens" }],
    });
  });
});
