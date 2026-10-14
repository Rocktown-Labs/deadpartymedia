import { useInfiniteQuery } from "@tanstack/react-query";
import { Image } from "@unpic/react";
import { BadgeDollarSign, Sparkles } from "lucide-react";
import { useEffect, useRef } from "react";
import {
  type ArtworkListItem,
  type PaginatedArtworksResult,
  listPublishedArtworksPaginated,
} from "#/lib/artworks.functions.ts";
import type { ExhibitionSortOption } from "./exhibition-filter-bar.tsx";

interface ArtworkWallGridProps {
  artmaker?: string;
  initialData: PaginatedArtworksResult;
  medium?: string;
  sort: ExhibitionSortOption;
  onSelectArtwork: (artwork: ArtworkListItem) => void;
}

export function ArtworkWallGrid({
  artmaker,
  initialData,
  medium,
  sort,
  onSelectArtwork,
}: ArtworkWallGridProps) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ["artworks", { artmaker, medium, sort }],
    queryFn: async ({ pageParam = 0 }) => {
      return await listPublishedArtworksPaginated({
        data: { artmaker, limit: 24, medium, offset: pageParam, sort },
      });
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset,
    initialData: {
      pages: [initialData],
      pageParams: [0],
    },
  });

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasNextPage || isFetchingNextPage) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void fetchNextPage();
        }
      },
      { rootMargin: "350px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const allArtworks = data.pages.flatMap((page) => page.items);

  if (allArtworks.length === 0) {
    return (
      <div className="rounded-2xl border border-neutral-800 bg-[#101010]/90 px-6 py-16 text-center">
        <Sparkles className="mx-auto size-8 text-[#7CFC00]/60" />
        <h3 className="mt-4 font-black text-lg text-white">No Artworks Found</h3>
        <p className="mt-2 text-sm text-neutral-400">
          {artmaker && medium
            ? "No published pieces match this artist and medium. Try clearing filters."
            : artmaker
              ? "No published pieces by this artist yet. Try selecting another artist or viewing all."
              : medium
                ? "No published pieces match this medium yet. Try selecting another category."
                : "The exhibition wall is being curated. Check back soon for new uploads."}
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* 2 columns on mobile, 3 on tablet, 4 on desktop */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5 md:grid-cols-3 xl:grid-cols-4">
        {allArtworks.map((artwork) => (
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
            className="group relative flex cursor-pointer flex-col overflow-hidden rounded-xl border border-neutral-800/80 bg-[#101010] text-left transition-[border-color,transform] duration-150 active:scale-[0.98] hover:border-[#7CFC00] [touch-action:manipulation] [-webkit-tap-highlight-color:transparent]"
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
                <div className="absolute top-2 right-2 flex items-center gap-1 rounded-full border border-[#7CFC00]/50 bg-black/80 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#7CFC00] backdrop-blur-md">
                  <BadgeDollarSign className="size-3" />
                  <span>Available</span>
                </div>
              ) : null}
            </div>

            <div className="flex flex-1 flex-col justify-between p-3 sm:p-4">
              <div>
                <p className="truncate text-[10px] font-black uppercase tracking-[0.2em] text-[#7CFC00]">
                  {artwork.medium ?? "Mixed practice"}
                </p>
                <h3 className="mt-1 line-clamp-1 font-black text-sm tracking-tight text-white sm:text-base group-hover:text-[#7CFC00]">
                  {artwork.title}
                </h3>
              </div>

              <div className="mt-2 flex items-center justify-between text-xs text-neutral-400">
                <span className="truncate">by {artwork.artmakerName}</span>
                {artwork.year ? (
                  <span className="shrink-0 text-[11px] text-neutral-500">{artwork.year}</span>
                ) : null}
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* Infinite Scroll Sentinel & Loading Indicator */}
      <div ref={sentinelRef} className="py-8 text-center">
        {isFetchingNextPage ? (
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5 md:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: Loading skeleton placeholder
                key={i}
                className="animate-pulse rounded-xl border border-neutral-800 bg-[#121212]"
              >
                <div className="aspect-square w-full bg-neutral-900" />
                <div className="space-y-2 p-3">
                  <div className="h-3 w-16 rounded bg-neutral-800" />
                  <div className="h-4 w-32 rounded bg-neutral-800" />
                </div>
              </div>
            ))}
          </div>
        ) : hasNextPage ? (
          <div className="text-xs font-bold uppercase tracking-widest text-neutral-500">
            Scroll to reveal more...
          </div>
        ) : (
          <div className="text-xs font-semibold uppercase tracking-widest text-neutral-600">
            End of exhibition wall
          </div>
        )}
      </div>
    </div>
  );
}
