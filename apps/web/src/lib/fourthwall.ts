import { readResponse } from "@dpmedia/api-client";
import { createServerFn } from "@tanstack/react-start";
import { getMusicApi } from "./api.server";
const product = createServerFn({ method: "GET" })
  .validator((data: { slug: string; currency: string }) => data)
  .handler(async ({ data }) =>
    readResponse(
      await getMusicApi().commerce.products[":slug"].$get({
        param: { slug: data.slug },
        query: { currency: data.currency },
      }),
    ),
  );
const products = createServerFn({ method: "GET" })
  .validator((data: { currency: string; limit: number }) => data)
  .handler(async ({ data }) =>
    readResponse(
      await getMusicApi().commerce.products.$get({
        query: { currency: data.currency, limit: String(data.limit) },
      }),
    ),
  );
export async function getProduct(slug: string, currency = "USD") {
  return product({ data: { slug, currency } }).catch(() => undefined);
}
export async function getProducts(currency = "USD", limit = 100) {
  return products({ data: { currency, limit } });
}
