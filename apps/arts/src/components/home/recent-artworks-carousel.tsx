import { Link } from "@tanstack/react-router";
import { Image } from "@unpic/react";
import { ArrowRight, BadgeDollarSign } from "lucide-react";
import type { ArtworkListItem } from "#/lib/artworks.functions.ts";

interface RecentArtworksCarouselProps {
  artworks: ArtworkListItem[];
  onSelectArtwork: (artwork: ArtworkListItem) => void;
}

export function RecentArtworksCarousel({ artworks, onSelectArtwork }: RecentArtworksCarouselProps) {
  if (artworks.length === 0) {
    return null;
  }

  return (
    <section className="border-t border-gray-800 px-6 py-14">
      <div className="container mx-auto">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="font-black text-xs uppercase tracking-[0.28em] text-[#7CFC00]">
              Fresh on the wall
            </p>
            <h2 className="mt-2 font-black text-3xl tracking-tight text-white md:text-4xl">
              Recent Artwork Uploads
            </h2>
            <p className="mt-2 max-w-xl text-sm text-neutral-400">
              The newest work published by Arkansas painters, photographers, ceramicists, and visual
              makers.
            </p>
          </div>
          <Link
            to="/exhibitions"
            className="group inline-flex items-center gap-2 font-black text-xs uppercase tracking-[0.22em] text-[#7CFC00] no-underline hover:text-[#a5ff43]"
          >
            <span>View all exhibitions</span>
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        {/* Horizontal touch scroll on mobile, responsive multi-column grid on desktop */}
        <div
          tabIndex={0}
          aria-label="Recent Artwork Uploads"
          className="flex gap-4 overflow-x-auto pb-4 -mx-6 px-6 [scroll-snap-type:x_mandatory] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] md:grid md:grid-cols-3 xl:grid-cols-4 md:overflow-visible md:mx-0 md:px-0 md:pb-0"
        >
          {artworks.map((artwork) => {
            const formattedPrice =
              artwork.priceCents && artwork.priceCents > 0
                ? `$${(artwork.priceCents / 100).toFixed(2)}`
                : null;

            return (
              <article
                key={artwork.id}
                onClick={() => onSelectArtwork(artwork)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectArtwork(artwork);
                  }
                }}
                tabIndex={0}
                role="button"
                className="group relative flex w-[270px] shrink-0 [scroll-snap-align:start] cursor-pointer flex-col overflow-hidden rounded-xl border border-neutral-800 bg-[#101010] text-left transition-[border-color,transform] duration-150 active:scale-[0.98] hover:border-[#7CFC00] md:w-auto [touch-action:manipulation] [-webkit-tap-highlight-color:transparent]"
              >
                <div className="relative aspect-square w-full overflow-hidden bg-neutral-950">
                  <Image
                    src={artwork.image}
                    alt={artwork.title}
                    width={480}
                    height={480}
                    className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  {artwork.forSale ? (
                    <div className="absolute top-2.5 right-2.5 flex items-center gap-1 rounded-full border border-[#7CFC00]/60 bg-black/85 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-[#7CFC00] backdrop-blur-md">
                      <BadgeDollarSign className="size-3" />
                      <span>{formattedPrice ?? "Available"}</span>
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-1 flex-col justify-between p-4">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-[10px] font-black uppercase tracking-[0.2em] text-[#7CFC00]">
                        {artwork.medium ?? "Visual Art"}
                      </p>
                      {artwork.year ? (
                        <span className="shrink-0 text-[11px] text-neutral-500">
                          {artwork.year}
                        </span>
                      ) : null}
                    </div>
                    <h3 className="mt-1.5 line-clamp-1 font-black text-base tracking-tight text-white group-hover:text-[#7CFC00]">
                      {artwork.title}
                    </h3>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-neutral-900 pt-3 text-xs text-neutral-400">
                    <span className="truncate">by {artwork.artmakerName}</span>
                    <span className="shrink-0 font-bold text-[10px] uppercase tracking-wider text-neutral-500 group-hover:text-[#7CFC00]">
                      View →
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
