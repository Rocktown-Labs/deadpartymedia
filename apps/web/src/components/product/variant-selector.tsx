"use client";

import clsx from "clsx";
import { useProduct, useUpdateURL } from "./product-context";
import type { ProductOption, ProductVariant } from "@/lib/types";
import posthog from "posthog-js";

interface Combination {
  id: string;
  availableForSale: boolean;
  [key: string]: string | boolean;
}

export function VariantSelector({
  options,
  variants,
}: {
  options: ProductOption[];
  variants: ProductVariant[];
}) {
  const { state, updateOption } = useProduct();
  const updateURL = useUpdateURL();
  const hasNoOptionsOrJustOneOption =
    !options.length || (options.length === 1 && options[0]?.values.length === 1);

  if (hasNoOptionsOrJustOneOption) {
    return null;
  }

  const combinations: Combination[] = variants.map((variant) => ({
    availableForSale: variant.availableForSale,
    id: variant.id,
    ...variant.selectedOptions.reduce(
      (accumulator, option) => ({ ...accumulator, [option.name.toLowerCase()]: option.value }),
      {},
    ),
  }));

  return options.map((option) => (
    <div key={option.id}>
      <dl className="mb-8">
        <dt className="mb-4 text-sm uppercase tracking-wide font-bold">{option.name}</dt>
        <dd className="flex flex-wrap gap-3">
          {option.values.map((value) => {
            const optionNameLowerCase = option.name.toLowerCase();

            const optionParams = { ...state, [optionNameLowerCase]: value };

            const filtered = Object.entries(optionParams).filter(([key, value]) =>
              options.find(
                (option) => option.name.toLowerCase() === key && option.values.includes(value),
              ),
            );
            const isAvailableForSale = combinations.find((combination) =>
              filtered.every(
                ([key, value]) => combination[key] === value && combination.availableForSale,
              ),
            );

            const isActive = state[optionNameLowerCase] === value;

            return (
              <button
                type="button"
                onClick={() => {
                  const newState = updateOption(optionNameLowerCase, value);
                  updateURL(newState);

                  // Track product variant selection
                  posthog.capture("product_variant_selected", {
                    is_available: !!isAvailableForSale,
                    option_name: option.name,
                    option_value: value,
                  });
                }}
                key={value}
                aria-disabled={!isAvailableForSale}
                disabled={!isAvailableForSale}
                title={`${option.name} ${value}${!isAvailableForSale ? " (Out of Stock)" : ""}`}
                className={clsx(
                  "flex min-w-[48px] items-center justify-center rounded-lg border px-4 py-2 text-sm font-medium transition-all",
                  {
                    "border-[#7CFC00] bg-[#7CFC00] text-black": isActive,
                    "border-gray-800 bg-transparent hover:border-[#7CFC00] hover:text-[#7CFC00]":
                      !isActive && isAvailableForSale,
                    "relative cursor-not-allowed border-gray-800 bg-gray-900 text-gray-600 line-through":
                      !isAvailableForSale,
                  },
                )}
              >
                {value}
              </button>
            );
          })}
        </dd>
      </dl>
    </div>
  ));
}
