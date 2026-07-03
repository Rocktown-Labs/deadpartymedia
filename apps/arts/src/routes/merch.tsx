import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ShoppingBag } from "lucide-react";
import { useState } from "react";
import { PageTitleHeader } from "#/components/page-title-header.tsx";
import { Button } from "#/components/ui/button.tsx";
import { addArtsCartItem, getArtsProducts, type ArtsProduct } from "#/lib/fourthwall.functions.ts";
import { createSeoMeta } from "#/lib/seo.ts";

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
  const products = Route.useLoaderData();
  const addItem = useServerFn(addArtsCartItem);
  const [pendingVariantId, setPendingVariantId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  return (
    <main className="px-6 pt-[calc(var(--navbar-offset)+2rem)] pb-20">
      <div className="container mx-auto">
        <PageTitleHeader
          eyebrow="Storefront"
          title="MERCH"
          description="Dead Party Arts goods, platform drops, and future artist-supporting collections from Fourthwall."
        />

        {message ? (
          <div className="mb-6 rounded-lg border border-[#7CFC00]/40 bg-[#7CFC00]/10 px-4 py-3 text-[#7CFC00] text-sm">
            {message}
          </div>
        ) : null}

        {products.length > 0 ? (
          <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {products.map((product) => {
              const variant = pickDefaultVariant(product);
              return (
                <article
                  key={product.id}
                  className="group overflow-hidden rounded-lg border border-gray-800 bg-[#111111] transition-colors hover:border-[#7CFC00]"
                >
                  <div className="grid aspect-square place-items-center overflow-hidden bg-black">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.title}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <ShoppingBag className="size-12 text-gray-700" />
                    )}
                  </div>
                  <div className="p-5">
                    <p className="font-black text-[#7CFC00] text-xs uppercase tracking-[0.22em]">
                      ${product.minPrice} {product.currency}
                    </p>
                    <h2 className="mt-2 font-black text-2xl tracking-tight">{product.title}</h2>
                    {product.description ? (
                      <p className="mt-3 line-clamp-3 text-gray-400 text-sm leading-6">
                        {product.description}
                      </p>
                    ) : null}
                    <Button
                      type="button"
                      className="mt-5 w-full"
                      disabled={
                        !variant || !product.availableForSale || pendingVariantId === variant.id
                      }
                      onClick={async () => {
                        if (!variant) {
                          return;
                        }

                        setMessage("");
                        setPendingVariantId(variant.id);
                        try {
                          const cartId = window.localStorage.getItem(CART_STORAGE_KEY) ?? undefined;
                          const cart = await addItem({
                            data: {
                              cartId,
                              merchandiseId: variant.id,
                              quantity: 1,
                            },
                          });
                          window.localStorage.setItem(CART_STORAGE_KEY, cart.id);
                          window.dispatchEvent(new Event("arts-cart-updated"));
                          setMessage(`${product.title} was added to your cart.`);
                        } catch (error) {
                          setMessage(
                            error instanceof Error
                              ? error.message
                              : "Could not add that item to the cart.",
                          );
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
