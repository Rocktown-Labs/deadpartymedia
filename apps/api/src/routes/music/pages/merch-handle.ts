import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import type { AppEnv } from "../../../bindings";
import { getProduct } from "../../../lib/fourthwall";
import type { Product } from "../../../lib/music/types";

const buildInitialVariantState = (product: Product): Record<string, string> => {
  const initialVariant =
    product.variants.find((variant) => variant.availableForSale) || product.variants[0];
  const state: Record<string, string> = {};

  for (const option of initialVariant?.selectedOptions ?? []) {
    state[option.name.toLowerCase()] = option.value;
  }

  return state;
};

export const loadMerchHandle = new Hono<AppEnv>().get(
  "/merch/:handle",
  zValidator("query", z.record(z.string(), z.string())),
  async (c) => {
    const { handle } = c.req.param();

    if (!handle) {
      throw new HTTPException(404, { message: "Not found" });
    }

    const product = await getProduct(c.env, handle, "USD");

    if (!product) {
      throw new HTTPException(404, { message: "Not found" });
    }

    const initialState = buildInitialVariantState(product);
    return c.json({ product, initialState });
  },
);
