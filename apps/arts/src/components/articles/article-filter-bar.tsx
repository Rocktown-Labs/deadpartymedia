import { ArrowDownUp, Check, Filter, Newspaper, Search, X } from "lucide-react";

export type ArticleSortOption = "recent" | "title";

interface ArticleFilterBarProps {
  activeCategory?: string;
  categories: string[];
  searchQuery: string;
  activeSort: ArticleSortOption;
  totalCount: number;
  onSelectCategory: (category?: string) => void;
  onSearchChange: (query: string) => void;
  onSelectSort: (sort: ArticleSortOption) => void;
}

export function ArticleFilterBar({
  activeCategory,
  categories,
  searchQuery,
  activeSort,
  totalCount,
  onSelectCategory,
  onSearchChange,
  onSelectSort,
}: ArticleFilterBarProps) {
  const hasActiveFilters = Boolean(activeCategory) || searchQuery.length > 0;

  return (
    <div className="mb-6 space-y-3">
      {/* Category Pill Strip */}
      <div
        tabIndex={0}
        aria-label="Filter articles by category"
        className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 [touch-action:pan-y] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      >
        <button
          type="button"
          onClick={() => onSelectCategory(undefined)}
          className={`flex h-9 shrink-0 items-center gap-1.5 rounded-full px-4 text-xs font-black uppercase tracking-[0.14em] transition-all active:scale-[0.96] [touch-action:manipulation] ${
            !activeCategory
              ? "border border-[#7CFC00] bg-[#7CFC00] text-black shadow-[0_0_16px_rgba(124,252,0,0.35)]"
              : "border border-neutral-800 bg-[#121212] text-neutral-300 hover:border-neutral-700 hover:text-white"
          }`}
        >
          {!activeCategory ? (
            <Check className="size-3.5 stroke-[3]" />
          ) : (
            <Newspaper className="size-3.5 text-neutral-400" />
          )}
          <span>All Stories</span>
        </button>

        {categories.map((category) => {
          const isSelected = activeCategory?.toLowerCase() === category.toLowerCase();
          return (
            <button
              key={category}
              type="button"
              onClick={() => onSelectCategory(isSelected ? undefined : category)}
              className={`flex h-9 shrink-0 items-center gap-1.5 rounded-full px-4 text-xs font-black uppercase tracking-[0.14em] transition-all active:scale-[0.96] [touch-action:manipulation] ${
                isSelected
                  ? "border border-[#7CFC00] bg-[#7CFC00] text-black shadow-[0_0_16px_rgba(124,252,0,0.35)]"
                  : "border border-neutral-800 bg-[#121212] text-neutral-300 hover:border-neutral-700 hover:text-white"
              }`}
            >
              {isSelected && <Check className="size-3.5 stroke-[3]" />}
              <span>{category}</span>
            </button>
          );
        })}
      </div>

      {/* Control bar: count, search, and sort */}
      <div className="flex flex-col gap-3 rounded-xl border border-neutral-800/80 bg-[#101010]/90 p-2.5 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between sm:px-4">
        {/* Count & Reset */}
        <div className="flex items-center gap-2">
          <Filter className="size-3.5 text-[#7CFC00]" />
          <span className="text-xs font-bold text-neutral-400">
            {totalCount} {totalCount === 1 ? "Article" : "Articles"}
          </span>
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={() => {
                onSelectCategory(undefined);
                onSearchChange("");
              }}
              className="text-[11px] font-semibold text-[#7CFC00] underline-offset-2 hover:underline"
            >
              Reset
            </button>
          ) : null}
        </div>

        {/* Search and Sort controls */}
        <div className="flex flex-1 flex-wrap items-center justify-end gap-2.5 sm:max-w-md">
          {/* Quick Search */}
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search title, artist, excerpt..."
              className="h-8 w-full rounded-lg border border-neutral-800 bg-neutral-900/90 pl-8 pr-7 text-xs font-medium text-white placeholder-neutral-500 transition-colors focus:border-[#7CFC00] focus:outline-none"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                aria-label="Clear search"
              >
                <X className="size-3.5" />
              </button>
            ) : null}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1.5 shrink-0">
            <ArrowDownUp className="size-3.5 text-neutral-500" />
            <select
              value={activeSort}
              onChange={(e) => onSelectSort(e.target.value as ArticleSortOption)}
              className="h-8 rounded-lg border border-neutral-800 bg-neutral-900 px-2.5 text-xs font-bold text-white transition-colors focus:border-[#7CFC00] focus:outline-none"
              aria-label="Sort articles"
            >
              <option value="recent">Latest Additions</option>
              <option value="title">Title (A–Z)</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
