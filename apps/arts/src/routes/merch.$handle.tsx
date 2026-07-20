import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Image } from "@unpic/react";
import { ArrowLeft, Check, Minus, Plus, ShoppingBag } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "#/components/ui/button.tsx";
import {
  addArtsCartItem,
  getArtsProductByHandle,
  type ArtsProduct,
} from "#/lib/fourthwall.functions.ts";
import { createSeoMeta } from "#/lib/seo.ts";
import { stripHtml } from "#/lib/utils.ts";

const CART_STORAGE_KEY = "dead-party-arts-cart-id";

export const Route = createFileRoute("/merch/$handle")({
  component: MerchProductDetailPage,
  head: ({ loaderData }) => {
    const product = loaderData;
    const cleanDesc = product
      ? stripHtml(product.description) || `Shop ${product.title} on Dead Party Arts.`
      : "Merch item on Dead Party Arts.";

    return createSeoMeta({
      description: cleanDesc,
      image: product?.image,
      path: product ? `/merch/${product.handle}` : "/merch",
      title: product?.title ?? "Merch Item",
    });
  },
  loader: async ({ params }) => {
    const product = await getArtsProductByHandle({ data: { handle: params.handle } });
    return product;
  },
});

function MerchProductDetailPage() {
  const product = Route.useLoaderData() as ArtsProduct | null;

  if (!product) {
    return (
      <main className="px-6 pt-[calc(var(--navbar-offset)+2rem)] pb-20">
        <div className="container mx-auto max-w-4xl text-center">
          <Link
            to="/merch"
            className="mb-8 inline-flex items-center text-[#7CFC00] transition-colors hover:text-[#7CFC00]/80"
          >
            <ArrowLeft className="mr-2 size-4" />
            Back to Merch
          </Link>
          <div className="rounded-lg border border-gray-800 bg-[#111111] p-12">
            <ShoppingBag className="mx-auto size-12 text-gray-600" />
            <h1 className="mt-4 font-black text-2xl">Product Not Found</h1>
            <p className="mt-2 text-gray-400 text-sm">
              The merch item you are looking for is unavailable or does not exist.
            </p>
          </div>
        </div>
      </main>
    );
  }

  const addItem = useServerFn(addArtsCartItem);
  const images = product.images.length > 0 ? product.images : [product.image].filter(Boolean);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const availableVariants = product.variants.filter((v) => v.availableForSale);
  const defaultVariant = availableVariants[0] ?? product.variants[0];
  const [selectedVariantId, setSelectedVariantId] = useState<string>(defaultVariant?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [isPending, setIsPending] = useState(false);

  const selectedVariant =
    product.variants.find((v) => v.id === selectedVariantId) ?? defaultVariant;
  const currentImage = images[selectedImageIndex] ?? product.image;

  const handleAddToCart = async () => {
    if (!selectedVariant) {
      return;
    }

    setIsPending(true);
    try {
      const cartId = window.localStorage.getItem(CART_STORAGE_KEY) ?? undefined;
      const cart = await addItem({
        data: {
          cartId,
          merchandiseId: selectedVariant.id,
          quantity,
        },
      });
      window.localStorage.setItem(CART_STORAGE_KEY, cart.id);
      window.dispatchEvent(new Event("arts-cart-updated"));
      toast.success(`${product.title} added to cart!`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not add item to cart. Please try again.",
      );
    } finally {
      setIsPending(false);
    }
  };

  return (
    <main className="px-6 pt-[calc(var(--navbar-offset)+2rem)] pb-20">
      <div className="container mx-auto max-w-6xl">
        <Link
          to="/merch"
          className="mb-8 inline-flex items-center font-bold text-[#7CFC00] text-sm transition-colors hover:text-[#7CFC00]/80"
        >
          <ArrowLeft className="mr-2 size-4" />
          Back to Merch
        </Link>

        <div className="grid gap-10 rounded-xl border border-gray-800 bg-[#0A0A0A] p-6 md:p-10 lg:grid-cols-2">
          {/* Gallery Column */}
          <div className="space-y-4">
            <div className="relative aspect-square overflow-hidden rounded-lg border border-gray-800 bg-black">
              {currentImage ? (
                <Image
                  src={currentImage}
                  alt={product.title}
                  width={800}
                  height={800}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="grid h-full place-items-center">
                  <ShoppingBag className="size-16 text-gray-700" />
                </div>
              )}
            </div>

            {images.length > 1 ? (
              <div className="flex flex-wrap gap-3">
                {images.map((imgUrl, idx) => (
                  <button
                    type="button"
                    key={imgUrl}
                    onClick={() => setSelectedImageIndex(idx)}
                    className={`relative size-20 overflow-hidden rounded-md border-2 bg-black transition-all ${
                      selectedImageIndex === idx
                        ? "border-[#7CFC00]"
                        : "border-gray-800 hover:border-gray-600"
                    }`}
                  >
                    <Image
                      src={imgUrl}
                      alt=""
                      width={80}
                      height={80}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          {/* Product Info Column */}
          <div className="flex flex-col justify-between space-y-6">
            <div>
              <span className="inline-block rounded-md bg-fuchsia-600 px-3 py-1 font-black text-white text-xs tracking-wider uppercase">
                MERCH
              </span>
              <h1 className="mt-3 font-black text-3xl text-white tracking-tight md:text-4xl">
                {product.title}
              </h1>

              <div className="mt-4 font-black text-3xl text-[#7CFC00]">
                ${selectedVariant ? selectedVariant.price : product.minPrice} {product.currency}
              </div>

              {stripHtml(product.description) ? (
                <div className="mt-6 border-gray-800/80 border-t pt-6 text-gray-300 text-sm leading-relaxed">
                  <p>{stripHtml(product.description)}</p>
                </div>
              ) : null}

              {/* Variants Selection */}
              {product.variants.length > 1 ? (
                <div className="mt-6 space-y-3">
                  <label
                    htmlFor="variant-select-label"
                    className="font-bold text-gray-400 text-xs tracking-wider uppercase"
                  >
                    Select Option / Size
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {product.variants.map((variant) => {
                      const isSelected = variant.id === selectedVariantId;
                      return (
                        <button
                          type="button"
                          key={variant.id}
                          disabled={!variant.availableForSale}
                          onClick={() => setSelectedVariantId(variant.id)}
                          className={`flex items-center gap-2 rounded-lg border px-4 py-2 font-bold text-sm transition-all ${
                            isSelected
                              ? "border-[#7CFC00] bg-[#7CFC00]/15 text-[#7CFC00]"
                              : variant.availableForSale
                                ? "border-gray-800 bg-[#111111] text-gray-300 hover:border-gray-600 hover:text-white"
                                : "cursor-not-allowed border-gray-900 bg-gray-950 text-gray-600 opacity-50 line-through"
                          }`}
                        >
                          {isSelected ? <Check className="size-3.5" /> : null}
                          <span>{variant.title}</span>
                          <span className="text-xs text-gray-400">(${variant.price})</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {/* Quantity Selector */}
              <div className="mt-6 space-y-2">
                <label
                  htmlFor="quantity-select-label"
                  className="font-bold text-gray-400 text-xs tracking-wider uppercase"
                >
                  Quantity
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={quantity <= 1}
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="grid size-10 place-items-center rounded-lg border border-gray-800 bg-[#111111] text-white transition-colors hover:border-[#7CFC00] disabled:opacity-40"
                  >
                    <Minus className="size-4" />
                  </button>
                  <span className="w-12 text-center font-bold text-lg text-white">{quantity}</span>
                  <button
                    type="button"
                    disabled={quantity >= 10}
                    onClick={() => setQuantity((q) => Math.min(10, q + 1))}
                    className="grid size-10 place-items-center rounded-lg border border-gray-800 bg-[#111111] text-white transition-colors hover:border-[#7CFC00] disabled:opacity-40"
                  >
                    <Plus className="size-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="border-gray-800/80 border-t pt-6">
              <Button
                type="button"
                className="h-12 w-full rounded-lg bg-[#7CFC00] font-black text-black text-base hover:bg-[#7CFC00]/90"
                disabled={
                  !product.availableForSale || !selectedVariant?.availableForSale || isPending
                }
                onClick={handleAddToCart}
              >
                {isPending
                  ? "Adding..."
                  : !product.availableForSale
                    ? "Out of Stock"
                    : "Add to Cart"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
