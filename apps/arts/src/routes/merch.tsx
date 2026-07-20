import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Image } from "@unpic/react";
import { ArrowRight, Filter, ShoppingBag } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageTitleHeader } from "#/components/page-title-header.tsx";
import { Button } from "#/components/ui/button.tsx";
import { addArtsCartItem, getArtsProducts, type ArtsProduct } from "#/lib/fourthwall.functions.ts";
import { createSeoMeta } from "#/lib/seo.ts";
import { stripHtml } from "#/lib/utils.ts";

const CART_STORAGE_KEY = "dead-party-arts-cart-id";

export const Route = createFileRoute("/merch")({
  component: MerchPage,
  head: () =>
    createSeoMeta({
      description:
        "Dead Party Arts merch and future artist-supporting collections for Arkansas visual culture.",
      path: "/merch",
      title: "Merch",
    }),
  loader: () => getArtsProducts(),
});

function pickDefaultVariant(product: ArtsProduct) {
  return product.variants.find((variant) => variant.availableForSale) ?? product.variants[0];
}

function MerchPage() {
  const products = Route.useLoaderData() as ArtsProduct[];
  const addItem = useServerFn(addArtsCartItem);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [pendingVariantId, setPendingVariantId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!message) {
      return;
    }
    const timer = setTimeout(() => {
      setMessage("");
    }, 4000);
    return () => clearTimeout(timer);
  }, [message]);

  const categories = ["All", ...new Set(products.map((p) => p.title.split(" ")[0]))];

  const filteredItems =
    selectedCategory === "All"
      ? products
      : products.filter((item) => item.title.startsWith(selectedCategory));

  return (
    <main className="px-6 pt-[calc(var(--navbar-offset)+2rem)] pb-20">
      <div className="container mx-auto">
        <PageTitleHeader
          eyebrow="Storefront"
          title="MERCH"
          description="Dead Party Arts goods, platform drops, and future artist-supporting collections from Fourthwall."
        />

        {message ? (
          <div className="mb-6 rounded-lg border border-[#7CFC00]/40 bg-[#7CFC00]/10 px-4 py-3 font-medium text-[#7CFC00] text-sm shadow-sm transition-all duration-300">
            {message}
          </div>
        ) : null}

        {products.length > 0 ? (
          <>
            {categories.length > 1 ? (
              <div className="mb-8 flex items-center gap-3 overflow-x-auto pb-2">
                <Filter className="size-4 shrink-0 text-gray-400" />
                {categories.map((category) => (
                  <button
                    type="button"
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`rounded-lg border px-5 py-2.5 font-bold text-xs uppercase tracking-wider whitespace-nowrap transition-all ${
                      selectedCategory === category
                        ? "border-[#7CFC00] bg-[#7CFC00] text-black"
                        : "border-gray-800 bg-[#111111] text-gray-400 hover:border-[#7CFC00] hover:text-white"
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            ) : null}

            <section className="grid gap-8 sm:grid-cols-2 xl:grid-cols-3">
              {filteredItems.map((product) => {
                const variant = pickDefaultVariant(product);
                const cleanDescription = stripHtml(product.description);

                return (
                  <article
                    key={product.id}
                    className="group flex flex-col justify-between overflow-hidden rounded-xl border border-gray-800 bg-[#111111] transition-all duration-300 hover:border-[#7CFC00]/60"
                  >
                    <div>
                      <Link
                        to="/merch/$handle"
                        params={{ handle: product.handle }}
                        className="block overflow-hidden"
                      >
                        <div className="relative aspect-square overflow-hidden bg-black">
                          {product.image ? (
                            <Image
                              src={product.image}
                              alt={product.title}
                              width={640}
                              height={640}
                              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <div className="grid h-full place-items-center">
                              <ShoppingBag className="size-12 text-gray-700" />
                            </div>
                          )}
                          <div className="absolute top-3 left-3 rounded bg-[#9400D3] px-3 py-1 font-black text-white text-[10px] tracking-wider uppercase">
                            MERCH
                          </div>
                        </div>
                      </Link>

                      <div className="p-6">
                        <Link
                          to="/merch/$handle"
                          params={{ handle: product.handle }}
                          className="group-hover:text-[#7CFC00] transition-colors"
                        >
                          <h2 className="font-black text-xl tracking-tight text-white">
                            {product.title}
                          </h2>
                        </Link>

                        {cleanDescription ? (
                          <p className="mt-2 line-clamp-2 text-gray-400 text-sm leading-relaxed">
                            {cleanDescription}
                          </p>
                        ) : null}

                        {product.variants.length > 1 ? (
                          <div className="mt-3 font-medium text-gray-500 text-xs tracking-wider uppercase">
                            {product.variants.length} options available
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="p-6 pt-0">
                      <div className="flex items-center justify-between border-gray-800/80 border-t pt-4">
                        <div className="font-black text-2xl text-[#7CFC00]">
                          ${product.minPrice}{" "}
                          <span className="text-xs text-gray-400">{product.currency}</span>
                        </div>
                        <Link
                          to="/merch/$handle"
                          params={{ handle: product.handle }}
                          className="flex items-center font-bold text-xs uppercase tracking-wider text-[#7CFC00] transition-transform group-hover:translate-x-1"
                        >
                          <span>View Details</span>
                          <ArrowRight className="ml-1 size-3.5" />
                        </Link>
                      </div>

                      <Button
                        type="button"
                        className="mt-4 h-11 w-full rounded-lg font-bold"
                        disabled={
                          !variant || !product.availableForSale || pendingVariantId === variant.id
                        }
                        onClick={async (e) => {
                          e.preventDefault();
                          if (!variant) {
                            return;
                          }

                          setMessage("");
                          setPendingVariantId(variant.id);
                          try {
                            const cartId =
                              window.localStorage.getItem(CART_STORAGE_KEY) ?? undefined;
                            const cart = await addItem({
                              data: {
                                cartId,
                                merchandiseId: variant.id,
                                quantity: 1,
                              },
                            });
                            window.localStorage.setItem(CART_STORAGE_KEY, cart.id);
                            window.dispatchEvent(new Event("arts-cart-updated"));
                            const msg = `${product.title} was added to your cart.`;
                            setMessage(msg);
                            toast.success(msg);
                          } catch (error) {
                            const err =
                              error instanceof Error
                                ? error.message
                                : "Could not add that item to the cart.";
                            setMessage(err);
                            toast.error(err);
                          } finally {
                            setPendingVariantId(null);
                          }
                        }}
                      >
                        {pendingVariantId === variant?.id ? "Adding..." : "Add to cart"}
                      </Button>
                    </div>
                  </article>
                );
              })}
            </section>
          </>
        ) : (
          <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="rounded-lg border border-gray-800 bg-[#111111] p-6">
              <ShoppingBag className="size-10 text-[#7CFC00]" />
              <h2 className="mt-5 font-black text-2xl">Arts collection pending</h2>
              <p className="mt-3 text-gray-400 leading-7">
                No Fourthwall products came back for the arts collection yet. Add the storefront
                token and optional arts collection id to Vercel, then this wall will render live
                products and cart actions.
              </p>
            </div>
            <div className="rounded-lg border border-dashed border-gray-800 bg-[#080808] p-8">
              <p className="font-black text-[#7CFC00] text-xs uppercase tracking-[0.28em]">
                Coming drop
              </p>
              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                {["Prints", "Shirts", "Studio goods"].map((item) => (
                  <div
                    key={item}
                    className="aspect-square rounded-lg border border-gray-800 bg-black p-4"
                  >
                    <p className="font-black text-gray-300">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
