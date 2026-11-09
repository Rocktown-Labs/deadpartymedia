"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useProduct, useUpdateURL } from "./product-context";
import type { Product } from "@/lib/types";
import Image from "next/image";
import clsx from "clsx";

export function Gallery({ product }: { product: Product }) {
  const { state, updateImage } = useProduct();
  const updateURL = useUpdateURL();
  const imageIndex = state.image ? Number.parseInt(state.image) : 0;

  const selectedVariant = product.variants.find((variant) =>
    variant.selectedOptions.find(
      (option) => option.name === "Color" && option.value === state["color"],
    ),
  );

  const images =
    selectedVariant?.images && selectedVariant.images.length > 0
      ? selectedVariant.images
      : product.images.slice(0, 5);

  const nextImageIndex = imageIndex + 1 < images.length ? imageIndex + 1 : 0;
  const previousImageIndex = imageIndex === 0 ? images.length - 1 : imageIndex - 1;

  const buttonClassName =
    "h-full px-4 transition-all ease-in-out hover:scale-110 hover:text-[#7CFC00] flex items-center justify-center";

  return (
    <>
      <div className="relative aspect-square h-full max-h-[550px] w-full overflow-hidden rounded-lg bg-black">
        {images[imageIndex] && (
          <Image
            className="h-full w-full object-contain"
            fill
            sizes="(min-width: 1024px) 66vw, 100vw"
            alt={images[imageIndex]?.altText as string}
            src={(images[imageIndex]?.url as string) || "/placeholder.svg"}
            priority={true}
          />
        )}

        {images.length > 1 ? (
          <div className="absolute bottom-[15%] flex w-full justify-center">
            <div className="mx-auto flex h-11 items-center rounded-full border border-gray-800 bg-[#0A0A0A]/80 text-white backdrop-blur">
              <button
                type="button"
                onClick={() => {
                  const newState = updateImage(previousImageIndex.toString());
                  updateURL(newState);
                }}
                aria-label="Previous product image"
                className={buttonClassName}
              >
                <ChevronLeft className="h-5" />
              </button>
              <div className="mx-1 h-6 w-px bg-gray-800"></div>
              <button
                type="button"
                onClick={() => {
                  const newState = updateImage(nextImageIndex.toString());
                  updateURL(newState);
                }}
                aria-label="Next product image"
                className={buttonClassName}
              >
                <ChevronRight className="h-5" />
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {images.length > 1 ? (
        <ul className="my-8 flex items-center justify-center gap-2 overflow-auto py-1">
          {images.map((image, index) => {
            const isActive = index === imageIndex;

            return (
              <li key={image.url} className="h-20 w-20">
                <button
                  type="button"
                  onClick={() => {
                    const newState = updateImage(index.toString());
                    updateURL(newState);
                  }}
                  aria-label="Select product image"
                  className={clsx(
                    "h-full w-full rounded-lg border-2 overflow-hidden transition-all",
                    isActive ? "border-[#7CFC00]" : "border-gray-800 hover:border-gray-600",
                  )}
                >
                  <Image
                    alt={image.altText}
                    src={image.url || "/placeholder.svg"}
                    width={80}
                    height={80}
                    className="h-full w-full object-cover"
                  />
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </>
  );
}
