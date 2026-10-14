import { Link } from "@tanstack/react-router";
import { Image } from "@unpic/react";
import { ArrowRight, ShoppingBag } from "lucide-react";
import type { ArtsProduct } from "#/lib/fourthwall.functions.ts";

interface ArtsMerchCarouselProps {
  products: ArtsProduct[];
}

export function ArtsMerchCarousel({ products }: ArtsMerchCarouselProps) {
  const visibleProducts = products.filter((product) => Boolean(product?.handle));

  return (
    <section className="border-t border-gray-800 px-6 py-16 md:py-20">
      <div className="container mx-auto">
        <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <div className="font-bold text-xs uppercase tracking-[0.28em] text-neutral-500">
              Official Store
            </div>
            <h2 className="mt-2 font-black text-3xl tracking-tight text-white md:text-5xl lg:text-6xl">
              Arts Merch
            </h2>
            <p className="mt-2 max-w-xl text-sm text-neutral-400">
              Dead Party Arts gear, limited drops, and upcoming artist-designed collection runs.
            </p>
          </div>
          <Link
            to="/merch"
            className="group inline-flex items-center gap-2 font-black text-xs uppercase tracking-[0.22em] text-[#7CFC00] no-underline transition-colors hover:text-[#a5ff43]"
          >
            <span>Shop All</span>
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        {visibleProducts.length > 0 ? (
          <div
            tabIndex={0}
            aria-label="Arts Merch Carousel"
            className="flex gap-6 overflow-x-auto pb-4 -mx-6 px-6 [scroll-snap-type:x_mandatory] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] md:gap-8"
          >
            {visibleProducts.map((product) => {
              const displayPrice = product.minPrice ? `$${product.minPrice}` : "Available";

              return (
                <Link
                  key={product.id}
                  to="/merch/$handle"
                  params={{ handle: product.handle }}
                  className="group w-[280px] shrink-0 [scroll-snap-align:start] cursor-pointer no-underline md:w-[320px]"
                >
                  <div className="relative mb-5 h-80 overflow-hidden rounded-xl border border-neutral-800 bg-black transition-[border-color,transform] duration-200 group-hover:border-[#7CFC00]/60 md:h-96">
                    <Image
                      src={product.image || "/images/deadpartyarts-trans.png"}
                      alt={product.title}
                      width={400}
                      height={480}
                      className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    <div className="absolute top-3.5 left-3.5">
                      <div className="bg-[#9400D3] px-3 py-1 font-black text-[11px] text-white tracking-wider uppercase">
                        MERCH
                      </div>
                    </div>
                  </div>

                  <h3 className="line-clamp-1 font-black text-xl text-white transition-colors group-hover:text-[#7CFC00] md:text-2xl">
                    {product.title}
                  </h3>

                  <p className="mt-2 mb-3 flex items-center font-bold text-neutral-400 text-sm uppercase tracking-wider">
                    <ShoppingBag className="mr-2 size-3.5 text-neutral-500" />
                    <span>{displayPrice}</span>
                  </p>

                  <div className="flex items-center gap-1 font-black text-xs uppercase tracking-wider text-[#7CFC00] transition-colors group-hover:text-[#a5ff43]">
                    <span>Shop Now</span>
                    <span className="transition-transform group-hover:translate-x-0.5">→</span>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-neutral-800 bg-[#101010] p-10 text-center">
            <ShoppingBag className="mx-auto size-8 text-neutral-600" />
            <h3 className="mt-3 font-black text-lg text-white">Artist Collections Coming Soon</h3>
            <p className="mt-1 text-sm text-neutral-400">
              The Dead Party Arts merchandise line is being produced. Check back soon for exclusive
              artist drops.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
