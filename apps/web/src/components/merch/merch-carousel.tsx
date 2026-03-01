"use client";

import Link from "next/link";
import Image from "next/image";
import type { Route } from "next";
import { ShoppingBag } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useProducts } from "@/lib/api/products";
import type { Product } from "@/lib/types";

interface MerchCarouselProps {
  products?: Product[];
  limit?: number;
  heading?: string;
  ctaHref?: Route;
  ctaLabel?: string;
  isLoading?: boolean;
  hasError?: boolean;
}

function formatPriceRange(product: Product) {
  const min = product.priceRange.minVariantPrice.amount;
  const max = product.priceRange.maxVariantPrice.amount;

  if (min === max) {return `$${min}`;}
  return `$${min} - $${max}`;
}

export function MerchCarousel({
  products,
  limit = 10,
  heading = "Merch",
  ctaHref = "/merch",
  ctaLabel = "Shop All",
  isLoading: isLoadingProp,
  hasError: hasErrorProp,
}: MerchCarouselProps) {
  const hasProvidedProducts = Array.isArray(products);
  const {
    data: fetchedProducts,
    isLoading: isQueryLoading,
    error,
  } = useProducts({
    enabled: !hasProvidedProducts,
  });
  const isLoading = isLoadingProp ?? (!hasProvidedProducts && isQueryLoading);
  const hasError = hasErrorProp ?? (!hasProvidedProducts && Boolean(error));

  const sourceProducts = (hasProvidedProducts ? products : fetchedProducts) || [];
  const visibleProducts = sourceProducts.filter((product) => product?.handle).slice(0, limit);

  return (
    <section className="py-20 px-6 border-t border-gray-800">
      <div className="container mx-auto">
        <div className="flex items-end justify-between mb-16">
          <div>
            <div className="text-sm tracking-[0.4em] text-gray-500 mb-4 uppercase font-bold">
              Official Store
            </div>
            <h2 className="text-5xl lg:text-6xl font-black tracking-tight">{heading}</h2>
          </div>
          <Link
            href={ctaHref}
            className="text-sm tracking-wider uppercase font-bold text-[#7CFC00] hover:text-[#7CFC00]/80 transition-colors flex items-center space-x-2"
          >
            <span>{ctaLabel}</span>
            <span>→</span>
          </Link>
        </div>

        {isLoading ? (
          <div className="flex overflow-x-auto gap-8 pb-4 scrollbar-hide -mx-6 px-6">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="shrink-0 min-w-[300px] max-w-[300px]">
                <div className="group cursor-pointer">
                  <div className="relative h-96 mb-6 overflow-hidden bg-black rounded-lg border border-gray-800">
                    <Skeleton className="absolute inset-0" />
                  </div>
                  <Skeleton className="h-7 w-5/6 mb-3" />
                  <Skeleton className="h-4 w-32 mb-4" />
                  <Skeleton className="h-4 w-28" />
                </div>
              </div>
            ))}
          </div>
        ) : (visibleProducts.length > 0 ? (
          <div className="flex overflow-x-auto gap-8 pb-4 scrollbar-hide -mx-6 px-6">
            {visibleProducts.map((product) => (
              <Link
                key={product.id}
                href={`/merch/${product.handle}` as Route}
                prefetch={false}
                className="shrink-0 min-w-[300px] max-w-[300px]"
              >
                <div className="group cursor-pointer">
                  <div className="relative h-96 mb-6 overflow-hidden bg-black rounded-lg">
                    <Image
                      src={product.featuredImage.url || "/placeholder.svg"}
                      alt={product.title}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-black via-transparent to-transparent" />
                    <div className="absolute top-4 left-4">
                      <div className="bg-[#9400D3] text-white px-4 py-2 font-black text-xs tracking-wider">
                        MERCH
                      </div>
                    </div>
                  </div>
                  <h3 className="text-2xl font-black mb-2 group-hover:text-[#7CFC00] transition-colors">
                    {product.title}
                  </h3>
                  <p className="text-sm text-gray-400 uppercase tracking-wider flex items-center mb-4">
                    <ShoppingBag className="w-3 h-3 mr-2" />
                    {formatPriceRange(product)}
                  </p>
                  <div className="text-xs font-bold tracking-wider uppercase text-[#7CFC00] flex items-center">
                    <span>Shop Now</span>
                    <span className="ml-2">→</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-gray-400 text-lg">
              {hasError ? "Merch is temporarily unavailable." : "Check back soon for new merch!"}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
