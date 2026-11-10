import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import type { AppEnv } from "../../bindings";
import { commerce } from "../../lib/music/commerce";
const key = "dead-party-cart-id";
export const musicCommerceRoutes = new Hono<AppEnv>()
  .get("/products/:slug", zValidator("query", z.record(z.string(), z.string())), async (c) => {
    const product = await commerce(c.env).getProduct(
      c.req.param("slug"),
      c.req.query("currency") || "USD",
    );
    if (!product) throw new HTTPException(404, { message: "Product not found" });
    return c.json(product);
  })
  .get("/products", zValidator("query", z.record(z.string(), z.string())), async (c) =>
    c.json(
      await commerce(c.env).getProducts(
        c.req.query("currency") || "USD",
        Math.min(100, Math.max(1, Number(c.req.query("limit") || 100))),
      ),
    ),
  )
  .get("/cart", async (c) =>
    c.json((await commerce(c.env).getCart(getCookie(c, key), "USD")) ?? null),
  )
  .post(
    "/cart/items",
    zValidator(
      "json",
      z.object({
        merchandiseId: z.string().min(1),
        quantity: z.number().int().min(0).max(99),
        operation: z.enum(["add", "update", "delete"]),
      }),
    ),
    async (c) => {
      const api = commerce(c.env),
        data = c.req.valid("json");
      const cart = (await api.getCart(getCookie(c, key), "USD")) || (await api.createCart());
      if (!cart.id) throw new HTTPException(502, { message: "Cart could not be created" });
      setCookie(c, key, cart.id, {
        httpOnly: true,
        secure: c.env.WEB_APP_URL.startsWith("https:"),
        sameSite: "Lax",
        path: "/",
        maxAge: 30 * 86400,
      });
      const line = cart.lines.find((line) => line.merchandise.id === data.merchandiseId);
      const result =
        data.operation === "add"
          ? await api.addToCart(cart.id, [
              { merchandiseId: data.merchandiseId, quantity: data.quantity },
            ])
          : (data.operation === "delete" || data.quantity === 0) && line?.id
            ? await api.removeFromCart(cart.id, [line.merchandise.id])
            : line?.id
              ? await api.updateCart(cart.id, [
                  { id: line.id, merchandiseId: data.merchandiseId, quantity: data.quantity },
                ])
              : await api.addToCart(cart.id, [
                  { merchandiseId: data.merchandiseId, quantity: data.quantity },
                ]);
      return c.json(result);
    },
  )
  .get("/checkout", async (c) => {
    const cartId = getCookie(c, key);
    if (!cartId || !c.env.FW_CHECKOUT_URL)
      throw new HTTPException(400, { message: "Checkout is unavailable" });
    const url = new URL("/checkout/", c.env.FW_CHECKOUT_URL);
    url.searchParams.set("cartId", cartId);
    url.searchParams.set("cartCurrency", "USD");
    return c.json({ url: url.toString() });
  });
