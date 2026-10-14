import { ArrowDownUp, Check, Filter } from "lucide-react";
import { MEDIUM_GROUPS } from "#/lib/mediums.ts";

export type ExhibitionSortOption = "recent" | "available" | "title";

interface ExhibitionFilterBarProps {
  activeMedium?: string;
  activeSort: ExhibitionSortOption;
  totalCount: number;
  groupCounts: Record<string, number>;
  onSelectMedium: (medium?: string) => void;
  onSelectSort: (sort: ExhibitionSortOption) => void;
}

const SORT_LABELS: Record<ExhibitionSortOption, string> = {
  recent: "Latest Additions",
  available: "Available / For Sale",
  title: "Title (A–Z)",
};

export function ExhibitionFilterBar({
  activeMedium,
  activeSort,
  totalCount,
  groupCounts,
  onSelectMedium,
  onSelectSort,
}: ExhibitionFilterBarProps) {
  return (
    <div className="mb-6 space-y-3">
      {/* Category Pill Strip */}
      <div
        tabIndex={0}
        aria-label="Filter by Medium Carousel"
        className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 [touch-action:pan-y] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      >
        <button
          type="button"
          onClick={() => onSelectMedium(undefined)}
          className={`flex h-9 shrink-0 items-center gap-1.5 rounded-full px-4 text-xs font-black uppercase tracking-[0.14em] transition-all active:scale-[0.96] [touch-action:manipulation] ${
            !activeMedium
              ? "border border-[#7CFC00] bg-[#7CFC00] text-black shadow-[0_0_16px_rgba(124,252,0,0.35)]"
              : "border border-neutral-800 bg-[#121212] text-neutral-300 hover:border-neutral-700 hover:text-white"
          }`}
        >
          {!activeMedium && <Check className="size-3.5 stroke-[3]" />}
          <span>All Mediums</span>
          <span
            className={`rounded-full px-1.5 text-[10px] font-black ${
              !activeMedium ? "bg-black/20 text-black" : "bg-neutral-800 text-neutral-300"
            }`}
          >
            {totalCount}
          </span>
        </button>

        {MEDIUM_GROUPS.map((group) => {
          const isSelected = activeMedium === group.slug;
          const Icon = group.icon;
          const groupTotal = groupCounts[group.slug] ?? 0;
          return (
            <button
              key={group.slug}
              type="button"
              onClick={() => onSelectMedium(isSelected ? undefined : group.slug)}
              className={`flex h-9 shrink-0 items-center gap-1.5 rounded-full px-4 text-xs font-black uppercase tracking-[0.14em] transition-all active:scale-[0.96] [touch-action:manipulation] ${
                isSelected
                  ? "border border-[#7CFC00] bg-[#7CFC00] text-black shadow-[0_0_16px_rgba(124,252,0,0.35)]"
                  : "border border-neutral-800 bg-[#121212] text-neutral-300 hover:border-neutral-700 hover:text-white"
              }`}
            >
              <Icon className="size-3.5" />
              <span>{group.label}</span>
              <span
                className={`rounded-full px-1.5 text-[10px] font-black ${
                  isSelected ? "bg-black/20 text-black" : "bg-neutral-800 text-neutral-300"
                }`}
              >
                {groupTotal}
              </span>
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
          {activeMedium ? (
            <button
              type="button"
              onClick={() => onSelectMedium(undefined)}
              className="text-[11px] font-semibold text-[#7CFC00] underline-offset-2 hover:underline"
            >
              Reset filter
            </button>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <ArrowDownUp className="size-3.5 text-neutral-500" />
          <span className="text-xs font-bold text-neutral-400 hidden sm:inline">Sort:</span>
          <select
            value={activeSort}
            onChange={(e) => onSelectSort(e.target.value as ExhibitionSortOption)}
            className="h-8 rounded-lg border border-neutral-800 bg-neutral-900 px-2.5 text-xs font-bold text-white transition-colors focus:border-[#7CFC00] focus:outline-none"
            aria-label="Sort artworks"
          >
            {(Object.keys(SORT_LABELS) as ExhibitionSortOption[]).map((option) => (
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
