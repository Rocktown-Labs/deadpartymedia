import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { musicCartRoutes } from "../src/routes/music/cart";
import type { AppEnv } from "../src/bindings";

const env = {
  DATABASE_URL: "",
  CLERK_SECRET_KEY: "sk_test_x",
  CLERK_PUBLISHABLE_KEY: "",
} as unknown as AppEnv["Bindings"];

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubFetch(responses: Array<{ body: unknown; status?: number }>) {
  let call = 0;
  const fetchMock = vi.fn(async () => {
    const response = responses[Math.min(call, responses.length - 1)] as {
      body: unknown;
      status?: number;
    };
    if (response.status && response.status >= 400) {
      call += 1;
      return new Response(JSON.stringify(response.body), {
        headers: { "content-type": "application/json" },
        status: response.status,
      });
    }
    call += 1;
    return new Response(JSON.stringify(response.body), {
      headers: { "content-type": "application/json" },
      status: 200,
    });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("music cart (Fourthwall proxy)", () => {
  it("GET /cart without cartId returns null", async () => {
    const response = await musicCartRoutes.request("/cart", {}, env);
    expect(response.status).toBe(200);
    expect(await response.json()).toBeNull();
  });

  it("POST /cart/items creates a cart then adds the item", async () => {
    const fetchMock = stubFetch([
      { body: { id: "cart-1", lines: [] } }, // create
      {
        body: {
          id: "cart-1",
          lines: [{ id: "v1-cart-1", merchandise: { id: "v1" }, quantity: 2 }],
        },
      }, // add
    ]);
    const response = await musicCartRoutes.request(
      "/cart/items",
      {
        body: JSON.stringify({ merchandiseId: "v1", quantity: 2 }),
        headers: { "content-type": "application/json" },
        method: "POST",
      },
      env,
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as { cart: { lines: unknown[] }; cartId: string };
    expect(body.cartId).toBe("cart-1");
    expect(body.cart.lines).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const createUrl = String(fetchMock.mock.calls[0]?.[0]);
    expect(createUrl).toContain("/carts?storefront_token=");
    const addUrl = String(fetchMock.mock.calls[1]?.[0]);
    expect(addUrl).toContain("/carts/cart-1/add");
  });

  it("POST /cart/items without merchandiseId is a 400", async () => {
    const response = await musicCartRoutes.request(
      "/cart/items",
      {
        body: JSON.stringify({}),
        headers: { "content-type": "application/json" },
        method: "POST",
      },
      env,
    );
    expect(response.status).toBe(400);
  });

  it("GET /cart/checkout-url is 400 without config", async () => {
    const response = await musicCartRoutes.request("/cart/checkout-url?cartId=cart-1", {}, env);
    expect(response.status).toBe(400);
  });
});
