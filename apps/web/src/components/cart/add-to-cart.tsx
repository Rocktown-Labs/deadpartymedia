"use client";

import { useFormStatus } from "react-dom";
import { addItem } from "@/app/cart/actions";
import { useCart } from "./cart-context";
import type { Product, ProductVariant } from "@/lib/types";
import { ShoppingCart } from "lucide-react";
import { useProduct } from "../product/product-context";
import posthog from "posthog-js";

function SubmitButton({ availableForSale }: { availableForSale: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending || !availableForSale}
      className="w-full rounded-lg bg-[#7CFC00] px-6 py-4 text-center text-sm font-bold text-black hover:bg-[#7CFC00]/90 disabled:opacity-50 uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
    >
      {pending ? (
        "Adding..."
      ) : availableForSale ? (
        <>
          <ShoppingCart className="w-4 h-4" />
          Add to Cart
        </>
      ) : (
        "Out of Stock"
      )}
    </button>
  );
}

export function AddToCart({ product }: { product: Product }) {
  const { addCartItem } = useCart();
  const { state } = useProduct();

  const variants = product.variants;

  // Find variant that matches all selected options
  const selectedVariant: ProductVariant | undefined = variants.find((variant: ProductVariant) =>
    variant.selectedOptions.every((option) => option.value === state[option.name.toLowerCase()]),
  );

  // Fallback to first available variant if no match, or single variant if only one exists
  const fallbackVariant = variants.find((v) => v.availableForSale) || 
    (variants.length === 1 ? variants[0] : undefined);
  
  const variant = selectedVariant || fallbackVariant;
  const availableForSale = variant ? variant.availableForSale : false;

  return (
    <form
      action={async () => {
        if (!variant) return;
        addCartItem(variant, product);
        await addItem(null, variant.id);

        // Track add to cart event
        posthog.capture("product_added_to_cart", {
          product_id: product.id,
          product_title: product.title,
          product_handle: product.handle,
          variant_id: variant.id,
          variant_title: variant.title,
          price: variant.price.amount,
          currency: variant.price.currencyCode,
        });
      }}
    >
      <SubmitButton availableForSale={availableForSale} />
    </form>
  );
}
