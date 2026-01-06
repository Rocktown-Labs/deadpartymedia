"use client"

import { useFormStatus } from "react-dom"
import { addItem } from "@/app/cart/actions"
import { useCart } from "./cart-context"
import type { Product, ProductVariant } from "@/lib/types"
import { ShoppingCart } from "lucide-react"
import { useProduct } from "../product/product-context"

function SubmitButton({ availableForSale }: { availableForSale: boolean }) {
  const { pending } = useFormStatus()

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
  )
}

export function AddToCart({ product }: { product: Product }) {
  const { addCartItem } = useCart()
  const { state } = useProduct()

  const variants = product.variants

  const selectedVariant: ProductVariant | undefined = variants.find((variant: ProductVariant) =>
    variant.selectedOptions.every((option) => option.value === state[option.name.toLowerCase()]),
  )

  const defaultVariant = variants.length === 1 ? variants[0] : undefined
  const variant = selectedVariant || defaultVariant
  const availableForSale = variant ? variant.availableForSale : false

  return (
    <form
      action={async () => {
        if (!variant) return
        addCartItem(variant, product)
        await addItem(null, variant.id)
      }}
    >
      <SubmitButton availableForSale={availableForSale} />
    </form>
  )
}
