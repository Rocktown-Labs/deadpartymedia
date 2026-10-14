import {
  ArrowDownUp,
  Calendar,
  Check,
  Clock,
  Filter,
  Flame,
  Search,
  Sparkles,
  X,
} from "lucide-react";

export type EventTabOption = "upcoming" | "weekend" | "all" | "past";
export type EventSortOption = "date_asc" | "date_desc";

interface EventFilterBarProps {
  activeTab: EventTabOption;
  searchQuery: string;
  activeSort: EventSortOption;
  totalCount: number;
  upcomingCount: number;
  weekendCount: number;
  allCount: number;
  pastCount: number;
  onSelectTab: (tab: EventTabOption) => void;
  onSearchChange: (query: string) => void;
  onSelectSort: (sort: EventSortOption) => void;
}

export function EventFilterBar({
  activeTab,
  searchQuery,
  activeSort,
  totalCount,
  upcomingCount,
  weekendCount,
  allCount,
  pastCount,
  onSelectTab,
  onSearchChange,
  onSelectSort,
}: EventFilterBarProps) {
  const tabs: { count: number; icon: typeof Calendar; id: EventTabOption; label: string }[] = [
    { count: upcomingCount, icon: Flame, id: "upcoming", label: "Upcoming" },
    { count: weekendCount, icon: Sparkles, id: "weekend", label: "This Weekend" },
    { count: allCount, icon: Calendar, id: "all", label: "All Events" },
    { count: pastCount, icon: Clock, id: "past", label: "Past Archive" },
  ];

  const hasActiveFilters = activeTab !== "upcoming" || searchQuery.length > 0;

  return (
    <div className="mb-6 space-y-3">
      {/* Category Pill Strip */}
      <div
        tabIndex={0}
        aria-label="Filter events"
        className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      >
        {tabs.map((tab) => {
          const isSelected = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTab(tab.id)}
              className={`flex h-9 shrink-0 items-center gap-1.5 rounded-full px-4 text-xs font-black uppercase tracking-[0.14em] transition-all active:scale-[0.96] [touch-action:manipulation] ${
                isSelected
                  ? "border border-[#7CFC00] bg-[#7CFC00] text-black shadow-[0_0_16px_rgba(124,252,0,0.35)]"
                  : "border border-neutral-800 bg-[#121212] text-neutral-300 hover:border-neutral-700 hover:text-white"
              }`}
            >
              {isSelected ? (
                <Check className="size-3.5 stroke-[3]" />
              ) : (
                <Icon className="size-3.5 text-neutral-400" />
              )}
              <span>{tab.label}</span>
              <span
                className={`ml-1 rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                  isSelected ? "bg-black/20 text-black" : "bg-neutral-800 text-neutral-400"
                }`}
              >
                {tab.count}
              </span>
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
            {totalCount} {totalCount === 1 ? "Event" : "Events"}
          </span>
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={() => {
                onSelectTab("upcoming");
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
              placeholder="Search title, venue, city..."
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
              onChange={(e) => onSelectSort(e.target.value as EventSortOption)}
              className="h-8 rounded-lg border border-neutral-800 bg-neutral-900 px-2.5 text-xs font-bold text-white transition-colors focus:border-[#7CFC00] focus:outline-none"
              aria-label="Sort events by date"
            >
              <option value="date_asc">Soonest First</option>
              <option value="date_desc">Latest First</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
