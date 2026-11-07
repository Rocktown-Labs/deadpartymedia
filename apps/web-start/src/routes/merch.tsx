import { createFileRoute } from "@tanstack/react-router";
import { apiFetch } from "../lib/api";

interface MerchProduct {
  id: string | number;
  image?: string | null;
  name: string;
  price?: string | null;
}

/**
 * Ported from apps/web/src/app/merch/page.tsx: the Fourthwall product list
 * is proxied through the platform API (GET /music/products). The product
 * detail route (merch/$handle) needs an API by-handle endpoint — tracked in
 * MIGRATION.md.
 */
export const Route = createFileRoute("/merch")({
  component: MerchPage,
  head: () => ({
    meta: [{ title: "Merch | Dead Party Media" }],
  }),
  loader: async () => {
    try {
      return {
        error: null as string | null,
        products: await apiFetch<MerchProduct[]>("/music/products?currency=USD&limit=50"),
      };
    } catch {
      return { error: "Failed to load merch", products: [] as MerchProduct[] };
    }
  },
});

function MerchPage() {
  const { error, products } = Route.useLoaderData();

  return (
    <main className="mx-auto max-w-4xl px-6 pt-24 pb-20">
      <h1 className="mb-2 text-4xl font-black">Merch</h1>
      <p className="mb-8 text-sm text-gray-400">Served by the platform API (Fourthwall proxy)</p>

      {error ? (
        <p className="rounded-md border border-red-500/40 px-4 py-3 text-red-400">{error}</p>
      ) : products.length === 0 ? (
        <p className="text-gray-400">No products available right now.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <li className="rounded-md border border-white/10 p-4" key={product.id}>
              {product.image ? (
                <img
                  alt={product.name}
                  className="mb-3 w-full rounded-md border border-white/10"
                  src={product.image}
                />
              ) : null}
              <h2 className="font-bold">{product.name}</h2>
              {product.price ? <p className="text-sm text-[#7CFC00]">{product.price}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
