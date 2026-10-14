import { Link } from "@tanstack/react-router";
import { Image } from "@unpic/react";
import { ArrowRight, UsersRound } from "lucide-react";

export interface SpotlightArtmaker {
  id: number;
  name: string;
  slug: string;
  city: string;
  state: string;
  image: string | null;
  medium: string[];
  artworkCount?: number;
}

interface ArtistSpotlightStripProps {
  artmakers: SpotlightArtmaker[];
  selectedArtmakerSlug?: string;
  onSelectArtmaker?: (slug?: string) => void;
}

export function ArtistSpotlightStrip({
  artmakers,
  selectedArtmakerSlug,
  onSelectArtmaker,
}: ArtistSpotlightStripProps) {
  if (artmakers.length === 0) {
    return null;
  }

  return (
    <section className="mb-8">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UsersRound className="size-4 text-[#7CFC00]" />
          <h2 className="font-black text-sm uppercase tracking-[0.22em] text-neutral-300">
            Artmakers on the Wall
          </h2>
          <span className="rounded-full bg-neutral-800/80 px-2 py-0.5 text-[11px] font-semibold text-neutral-400">
            {artmakers.length}
          </span>
          {selectedArtmakerSlug ? (
            <button
              type="button"
              onClick={() => onSelectArtmaker?.(undefined)}
              className="ml-2 rounded-full border border-neutral-700 bg-neutral-900 px-2.5 py-0.5 text-[11px] font-semibold text-[#7CFC00] hover:border-[#7CFC00] transition-colors"
            >
              Clear filter
            </button>
          ) : null}
        </div>
        <Link
          to="/artmakers"
          className="group inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.18em] text-[#7CFC00] no-underline hover:text-[#a5ff43]"
        >
          <span>View all</span>
          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      <div
        tabIndex={0}
        aria-label="Artmakers on the Wall Carousel"
        className="flex gap-3 overflow-x-auto pb-2 pt-1 scroll-smooth [scroll-snap-type:x_mandatory] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      >
        {artmakers.map((artmaker) => {
          const primaryMedium = artmaker.medium[0] ?? "Visual Art";
          const isSelected = selectedArtmakerSlug === artmaker.slug;

          if (onSelectArtmaker) {
            return (
              <button
                key={artmaker.id}
                type="button"
                onClick={() => onSelectArtmaker(isSelected ? undefined : artmaker.slug)}
                aria-pressed={isSelected}
                className={`group flex w-52 shrink-0 scroll-snap-align-start items-center gap-3 rounded-xl border p-2.5 text-left text-white transition-[border-color,background-color,box-shadow,transform] duration-150 active:scale-[0.97] [touch-action:manipulation] ${
                  isSelected
                    ? "border-[#7CFC00] bg-[#161616] shadow-[0_0_16px_rgba(124,252,0,0.35)]"
                    : "border-neutral-800/90 bg-[#111111]/80 hover:border-[#7CFC00]/60"
                }`}
              >
                <div
                  className={`relative size-12 shrink-0 overflow-hidden rounded-lg border bg-neutral-950 ${
                    isSelected ? "border-[#7CFC00]" : "border-neutral-800"
                  }`}
                >
                  {artmaker.image ? (
                    <Image
                      src={artmaker.image}
                      alt={artmaker.name}
                      width={96}
                      height={96}
                      className="size-full object-cover transition-transform duration-200 group-hover:scale-105"
                    />
                  ) : (
                    <div className="grid size-full place-items-center font-black text-lg text-[#7CFC00]">
                      {artmaker.name.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3
                    className={`truncate font-black text-sm tracking-tight ${
                      isSelected ? "text-[#7CFC00]" : "text-white group-hover:text-[#7CFC00]"
                    }`}
                  >
                    {artmaker.name}
                  </h3>
                  <p className="truncate text-xs text-neutral-400">
                    {artmaker.city}, {artmaker.state}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] font-medium text-neutral-500">
                    {isSelected ? "Selected" : primaryMedium}
                  </p>
                </div>
              </button>
            );
          }

          return (
            <Link
              key={artmaker.id}
              to="/artmakers/$slug"
              params={{ slug: artmaker.slug }}
              className="group flex w-52 shrink-0 scroll-snap-align-start items-center gap-3 rounded-xl border border-neutral-800/90 bg-[#111111]/80 p-2.5 text-white no-underline transition-[border-color,transform] duration-150 active:scale-[0.97] hover:border-[#7CFC00]/60 [touch-action:manipulation]"
            >
              <div className="relative size-12 shrink-0 overflow-hidden rounded-lg border border-neutral-800 bg-neutral-950">
                {artmaker.image ? (
                  <Image
                    src={artmaker.image}
                    alt={artmaker.name}
                    width={96}
                    height={96}
                    className="size-full object-cover transition-transform duration-200 group-hover:scale-105"
                  />
                ) : (
                  <div className="grid size-full place-items-center font-black text-lg text-[#7CFC00]">
                    {artmaker.name.slice(0, 1).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-black text-sm tracking-tight text-white group-hover:text-[#7CFC00]">
                  {artmaker.name}
                </h3>
                <p className="truncate text-xs text-neutral-400">
                  {artmaker.city}, {artmaker.state}
                </p>
                <p className="mt-0.5 truncate text-[11px] font-medium text-neutral-500">
                  {primaryMedium}
                </p>
              </div>
            </Link>
          );
        })}

        <Link
          to="/artmakers"
          className="group flex w-44 shrink-0 scroll-snap-align-start flex-col items-center justify-center rounded-xl border border-dashed border-neutral-800 bg-[#111111]/40 p-3 text-center no-underline transition-colors hover:border-[#7CFC00] active:scale-[0.97]"
        >
          <span className="font-black text-xs uppercase tracking-[0.18em] text-[#7CFC00]">
            Explore All
          </span>
          <span className="mt-1 flex items-center gap-1 text-[11px] text-neutral-400">
            {artmakers.length} Artists <ArrowRight className="size-3" />
          </span>
        </Link>
      </div>
    </section>
  );
}
