import { createFileRoute, notFound } from "@tanstack/react-router";
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
                  className="flex items-center justify-between rounded-md border border-white/10 px-4 py-2 text-sm"
                  key={variant.id}
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
        </div>
      </div>
    </main>
  );
}
