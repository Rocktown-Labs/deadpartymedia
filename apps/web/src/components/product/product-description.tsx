import { AddToCart } from "@/components/cart/add-to-cart"
import type { Product } from "@/lib/types"
import { VariantSelector } from "./variant-selector"

export function ProductDescription({ product }: { product: Product }) {
  return (
    <>
      <div className="mb-6 flex flex-col border-b border-gray-800 pb-6">
        <h1 className="mb-4 text-4xl font-black">{product.title}</h1>
        <div className="flex items-center gap-4">
          <div className="rounded-full bg-[#7CFC00] px-4 py-2 text-lg font-black text-black">
            ${product.priceRange.maxVariantPrice.amount}
          </div>
          {product.priceRange.minVariantPrice.amount !== product.priceRange.maxVariantPrice.amount && (
            <span className="text-sm text-gray-400">Starting at ${product.priceRange.minVariantPrice.amount}</span>
          )}
        </div>
      </div>

      <VariantSelector options={product.options} variants={product.variants} />

      {product.descriptionHtml || product.description ? (
        <div 
          className="mb-6 text-sm leading-relaxed text-gray-300 prose prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: product.descriptionHtml || product.description || "" }}
        />
      ) : null}

      <AddToCart product={product} />
    </>
  )
}
