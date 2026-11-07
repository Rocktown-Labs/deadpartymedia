import { createFileRoute, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { apiPost, getCartId, setCartId } from "../lib/api-client";
import { apiFetch } from "../lib/api";
import { formatVariantPrice, type ApiProduct } from "../lib/products";

/**
 * Ported from apps/web/src/app/merch/[handle]/page.tsx, now reading the
 * platform API's by-handle endpoint (GET /music/products/:handle).
 */
export const Route = createFileRoute("/merch/$handle")({
  component: MerchDetailPage,
  loader: async ({ params }) => {
    const product = await apiFetch<ApiProduct>(
      `/music/products/${encodeURIComponent(params.handle)}`,
    ).catch(() => null);
    if (!product) {
      throw notFound();
    }
    return { product };
  },
  head: ({ loaderData }) => {
    const product = loaderData?.product;
    if (!product) {
      return { meta: [{ title: "Product Not Found | Dead Party Media" }] };
    }
    return {
      meta: [
        { content: product.description ?? product.title, name: "description" },
        ...(product.featuredImage
          ? [{ content: product.featuredImage.url, property: "og:image" }]
          : []),
        { title: `${product.title} | Dead Party Media Merch` },
      ],
    };
  },
});

function MerchDetailPage() {
  const { product } = Route.useLoaderData();
  const available = product.variants.filter((variant) => variant.availableForSale);
  const [selected, setSelected] = useState<string | null>(available[0]?.id ?? null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function addToCart() {
    if (!selected) {
      return;
    }
    setBusy(true);
    setMessage(null);
    const result = await apiPost<{ cartId: string }>("/music/cart/items", {
      cartId: getCartId() ?? undefined,
      merchandiseId: selected,
      quantity: 1,
    });
    setBusy(false);
    if (!result.ok || !result.data?.cartId) {
      setMessage(result.error ?? "Could not add to cart");
      return;
    }
    setCartId(result.data.cartId);
    setMessage("Added to cart ✓");
  }

  return (
    <main className="mx-auto max-w-4xl px-6 pt-24 pb-20">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {product.featuredImage ? (
          <img
            alt={product.featuredImage.altText ?? product.title}
            className="w-full rounded-md border border-white/10"
            src={product.featuredImage.url}
          />
        ) : null}

        <div>
          <h1 className="mb-3 text-3xl font-black">{product.title}</h1>
          {product.variants[0] ? (
            <p className="mb-4 text-xl text-[#7CFC00]">{formatVariantPrice(product.variants[0])}</p>
          ) : null}
          {product.description ? <p className="mb-6 text-gray-300">{product.description}</p> : null}

          {available.length > 0 ? (
            <ul className="space-y-2">
              {available.map((variant) => (
                <li
                  className={
                    selected === variant.id
                      ? "flex items-center justify-between rounded-md border border-[#7CFC00]/60 bg-[#7CFC00]/5 px-4 py-2 text-sm"
                      : "flex cursor-pointer items-center justify-between rounded-md border border-white/10 px-4 py-2 text-sm"
                  }
                  key={variant.id}
                  onClick={() => {
                    setSelected(variant.id);
                  }}
                >
                  <span>
                    {variant.selectedOptions.map((option) => option.value).join(" / ") ||
                      variant.title}
                  </span>
                  <span className="text-[#7CFC00]">{formatVariantPrice(variant)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-400">Currently sold out.</p>
          )}

          {available.length > 0 ? (
            <div className="mt-4">
              <Button
                className="bg-[#7CFC00] text-black hover:bg-[#7CFC00]/90"
                disabled={busy}
                onClick={() => {
                  void addToCart();
                }}
                type="button"
              >
                {busy ? "Adding…" : "Add to cart"}
              </Button>
              {message ? <p className="mt-2 text-sm text-gray-300">{message}</p> : null}
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
