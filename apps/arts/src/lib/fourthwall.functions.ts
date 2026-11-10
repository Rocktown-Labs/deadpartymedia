import { readResponse } from "@dpmedia/api-client";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getArtsApi } from "./api.server";

export interface ArtsProduct {
  id: string;
  title: string;
  handle: string;
  description: string;
  image: string;
  images: string[];
  availableForSale: boolean;
  minPrice: string;
  currency: string;
  variants: {
    id: string;
    title: string;
    availableForSale: boolean;
    price: string;
    currency: string;
    options: string[];
  }[];
}

export interface ArtsCart {
  id: string;
  lines: {
    id: string;
    merchandiseId: string;
    productTitle: string;
    variantTitle: string;
    image: string;
    quantity: number;
    total: string;
    currency: string;
  }[];
  totalQuantity: number;
  subtotal: string;
  currency: string;
  checkoutUrl: string | null;
}

const cartInputSchema = z.object({
  cartId: z.string().optional(),
});

const cartLineSchema = z.object({
  cartId: z.string().optional(),
  merchandiseId: z.string().min(1),
  quantity: z.number().int().min(0).max(99).default(1),
});

export const getArtsProducts = createServerFn({ method: "GET" }).handler(async () => {
  return readResponse(await getArtsApi().products.$get());
});

export const getArtsProductByHandle = createServerFn({ method: "GET" })
  .validator(z.object({ handle: z.string() }))
  .handler(async ({ data }) => {
    return readResponse(
      await getArtsApi().products[":handle"].$get({ param: { handle: data.handle } }),
    );
  });

export const getArtsCart = createServerFn({ method: "GET" })
  .validator(cartInputSchema)
  .handler(async ({ data }) => {
    if (!data.cartId) return null;
    return readResponse(await getArtsApi().cart.$get({ query: { cartId: data.cartId } }));
  });

export const addArtsCartItem = createServerFn({ method: "POST" })
  .validator(cartLineSchema)
  .handler(async ({ data }) => {
    return readResponse(await getArtsApi().cart.items.$post({ json: data }));
  });

export const updateArtsCartItem = createServerFn({ method: "POST" })
  .validator(cartLineSchema)
  .handler(async ({ data }) => {
    return readResponse(await getArtsApi().cart.items.$patch({ json: data }));
  });
