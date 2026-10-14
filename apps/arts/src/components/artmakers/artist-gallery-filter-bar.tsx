import { ArrowDownUp, BadgeDollarSign, Check, Filter } from "lucide-react";

export type ArtistGallerySortOption = "recent" | "available" | "title";

interface ArtistGalleryFilterBarProps {
  activeMedium?: string;
  availableOnly: boolean;
  activeSort: ArtistGallerySortOption;
  totalCount: number;
  mediums: string[];
  hasForSale: boolean;
  onSelectMedium: (medium?: string) => void;
  onToggleAvailable: () => void;
  onSelectSort: (sort: ArtistGallerySortOption) => void;
}

const SORT_LABELS: Record<ArtistGallerySortOption, string> = {
  recent: "Latest Additions",
  available: "Available / For Sale",
  title: "Title (A–Z)",
};

export function ArtistGalleryFilterBar({
  activeMedium,
  availableOnly,
  activeSort,
  totalCount,
  mediums,
  hasForSale,
  onSelectMedium,
  onToggleAvailable,
  onSelectSort,
}: ArtistGalleryFilterBarProps) {
  const isAllSelected = !activeMedium && !availableOnly;

  return (
    <div className="mb-6 space-y-3">
      {/* Category Pill Strip */}
      <div
        tabIndex={0}
        aria-label="Filter gallery works"
        className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      >
        <button
          type="button"
          onClick={() => {
            onSelectMedium(undefined);
            if (availableOnly) onToggleAvailable();
          }}
          className={`flex h-9 shrink-0 items-center gap-1.5 rounded-full px-4 text-xs font-black uppercase tracking-[0.14em] transition-all active:scale-[0.96] [touch-action:manipulation] ${
            isAllSelected
              ? "border border-[#7CFC00] bg-[#7CFC00] text-black shadow-[0_0_16px_rgba(124,252,0,0.35)]"
              : "border border-neutral-800 bg-[#121212] text-neutral-300 hover:border-neutral-700 hover:text-white"
          }`}
        >
          {isAllSelected && <Check className="size-3.5 stroke-[3]" />}
          <span>All Works</span>
        </button>

        {hasForSale ? (
          <button
            type="button"
            onClick={onToggleAvailable}
            className={`flex h-9 shrink-0 items-center gap-1.5 rounded-full px-4 text-xs font-black uppercase tracking-[0.14em] transition-all active:scale-[0.96] [touch-action:manipulation] ${
              availableOnly
                ? "border border-[#7CFC00] bg-[#7CFC00] text-black shadow-[0_0_16px_rgba(124,252,0,0.35)]"
                : "border border-neutral-800 bg-[#121212] text-neutral-300 hover:border-[#7CFC00]/60 hover:text-white"
            }`}
          >
            <BadgeDollarSign className="size-3.5" />
            <span>Available For Sale</span>
          </button>
        ) : null}

        {mediums.map((medium) => {
          const isSelected = activeMedium?.toLowerCase() === medium.toLowerCase();
          return (
            <button
              key={medium}
              type="button"
              onClick={() => onSelectMedium(isSelected ? undefined : medium)}
              className={`flex h-9 shrink-0 items-center gap-1.5 rounded-full px-4 text-xs font-black uppercase tracking-[0.14em] transition-all active:scale-[0.96] [touch-action:manipulation] ${
                isSelected
                  ? "border border-[#7CFC00] bg-[#7CFC00] text-black shadow-[0_0_16px_rgba(124,252,0,0.35)]"
                  : "border border-neutral-800 bg-[#121212] text-neutral-300 hover:border-neutral-700 hover:text-white"
              }`}
            >
              {isSelected && <Check className="size-3.5 stroke-[3]" />}
              <span>{medium}</span>
            </button>
          );
        })}
      </div>

      {/* Control bar: count and sort */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-800/80 bg-[#101010]/90 px-4 py-2.5 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Filter className="size-3.5 text-[#7CFC00]" />
          <span className="text-xs font-bold text-neutral-400">
            {totalCount} {totalCount === 1 ? "Artwork" : "Artworks"}
          </span>
          {activeMedium || availableOnly ? (
            <button
              type="button"
              onClick={() => {
                onSelectMedium(undefined);
                if (availableOnly) onToggleAvailable();
              }}
              className="text-[11px] font-semibold text-[#7CFC00] underline-offset-2 hover:underline"
            >
              Reset filter
            </button>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <ArrowDownUp className="size-3.5 text-neutral-500" />
          <span className="hidden text-xs font-bold text-neutral-400 sm:inline">Sort:</span>
          <select
            value={activeSort}
            onChange={(e) => onSelectSort(e.target.value as ArtistGallerySortOption)}
            className="h-8 rounded-lg border border-neutral-800 bg-neutral-900 px-2.5 text-xs font-bold text-white transition-colors focus:border-[#7CFC00] focus:outline-none"
            aria-label="Sort artworks"
          >
            {(Object.keys(SORT_LABELS) as ArtistGallerySortOption[]).map((option) => (
              <option key={option} value={option}>
                {SORT_LABELS[option]}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
