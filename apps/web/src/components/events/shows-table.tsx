"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  type ColumnDef,
  flexRender,
  type SortingState,
} from "@tanstack/react-table";
import { isPastEventDateKey, getLocalDateKey } from "@/lib/events/date-state";
import type { EventList } from "@/lib/api/events";
import { MapPin, Ticket, Search, History } from "lucide-react";
import { cn } from "@/lib/utils";

interface ShowsTableProps {
  events: EventList[];
  compact?: boolean;
  showFilters?: boolean;
  limit?: number;
  className?: string;
  onOpenSubmitModal?: () => void;
}

interface DisplayDate {
  month: string;
  day: string;
  weekday: string;
  year: number | string;
}

function formatDisplayDate(dateStr: string): DisplayDate {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      return { month: "DATE", day: dateStr, weekday: "", year: "" };
    }
    return {
      month: d.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
      day: d.toLocaleDateString("en-US", { day: "numeric" }),
      weekday: d.toLocaleDateString("en-US", { weekday: "short" }),
      year: d.getFullYear(),
    };
  } catch {
    return { month: "DATE", day: dateStr, weekday: "", year: "" };
  }
}

export function ShowsTable({
  events = [],
  compact = false,
  showFilters = true,
  limit,
  className,
  onOpenSubmitModal,
}: ShowsTableProps) {
  const [globalFilter, setGlobalFilter] = useState("");
  const [selectedGenre, setSelectedGenre] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<"all" | "upcoming" | "past">("all");
  const [sorting, setSorting] = useState<SortingState>([
    { id: "date", desc: true },
  ]);

  const todayKey = useMemo(() => getLocalDateKey(), []);

  const filteredData = useMemo(() => {
    let list = [...events];

    if (selectedGenre !== "ALL") {
      list = list.filter((e) => e.genre?.toUpperCase() === selectedGenre);
    }

    if (statusFilter === "upcoming") {
      list = list.filter((e) => !isPastEventDateKey(e.date));
    } else if (statusFilter === "past") {
      list = list.filter((e) => isPastEventDateKey(e.date));
    }

    // Sort: recent to least (default desc by date)
    list.sort((a, b) => {
      if (a.date > b.date) return -1;
      if (a.date < b.date) return 1;
      return 0;
    });

    if (limit && limit > 0) {
      return list.slice(0, limit);
    }

    return list;
  }, [events, selectedGenre, statusFilter, limit]);

  const columns = useMemo<ColumnDef<EventList>[]>(
    () => [
      {
        accessorKey: "date",
        header: "DATE",
        cell: ({ row }) => {
          const item = row.original;
          const isPast = isPastEventDateKey(item.date);
          const isToday = item.date === todayKey;
          const d = formatDisplayDate(item.date);

          return (
            <div className="flex items-center gap-2 sm:gap-3 py-1">
              <div
                className={cn(
                  "flex flex-col items-center justify-center rounded px-2 py-1 min-w-[50px] border text-center transition-colors",
                  isPast
                    ? "bg-zinc-900/60 border-zinc-800 text-zinc-500"
                    : isToday
                    ? "bg-[#7CFC00] border-[#7CFC00] text-black font-black"
                    : "bg-zinc-900 border-zinc-700 text-white"
                )}
              >
                <span className="text-[10px] font-bold tracking-widest leading-none">
                  {d.month}
                </span>
                <span className="text-base sm:text-lg font-black leading-tight">
                  {d.day}
                </span>
              </div>
              <div className="hidden sm:flex flex-col">
                <span
                  className={cn(
                    "text-xs font-mono tracking-wider uppercase",
                    isPast ? "text-zinc-600 line-through" : "text-zinc-400"
                  )}
                >
                  {d.weekday}
                </span>
                {isPast ? (
                  <span className="text-[9px] font-semibold text-zinc-500 uppercase tracking-widest">
                    PAST
                  </span>
                ) : isToday ? (
                  <span className="text-[9px] font-bold text-[#7CFC00] uppercase tracking-widest animate-pulse">
                    TONIGHT
                  </span>
                ) : (
                  <span className="text-[9px] font-semibold text-[#7CFC00] uppercase tracking-widest">
                    UPCOMING
                  </span>
                )}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "title",
        header: "SHOW / ARTISTS",
        cell: ({ row }) => {
          const item = row.original;
          const isPast = isPastEventDateKey(item.date);

          return (
            <div className="flex items-center gap-3 py-1 min-w-[170px] sm:min-w-[220px]">
              <Link
                href={`/events/${item.slug}`}
                className="relative w-11 h-11 sm:w-12 sm:h-12 shrink-0 rounded-md overflow-hidden bg-zinc-900 border border-zinc-800 hover:border-[#7CFC00]/60 transition-colors"
              >
                <Image
                  src={item.image || "/placeholder.svg"}
                  alt={item.title}
                  fill
                  className={cn(
                    "object-cover transition-transform group-hover:scale-105",
                    isPast && "grayscale opacity-50"
                  )}
                />
              </Link>
              <div className="flex flex-col min-w-0">
                <Link
                  href={`/events/${item.slug}`}
                  className={cn(
                    "font-bold text-sm sm:text-base leading-snug transition-colors line-clamp-1 group-hover:underline",
                    isPast
                      ? "line-through text-zinc-400 hover:text-zinc-200"
                      : "text-white hover:text-[#7CFC00]"
                  )}
                  title={item.title}
                >
                  {item.title}
                </Link>
                {item.artists && item.artists.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1 mt-0.5">
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
                      w/
                    </span>
                    {item.artists.map((artist, idx) => (
                      <span key={artist.id ?? idx} className="text-[11px]">
                        {artist.slug ? (
                          <Link
                            href={`/artists/${artist.slug}`}
                            onClick={(e) => e.stopPropagation()}
                            className={cn(
                              "hover:underline font-medium",
                              isPast
                                ? "text-zinc-500 hover:text-zinc-300"
                                : "text-zinc-300 hover:text-[#7CFC00]"
                            )}
                          >
                            {artist.name}
                          </Link>
                        ) : (
                          <span className={isPast ? "text-zinc-500" : "text-zinc-400"}>
                            {artist.name}
                          </span>
                        )}
                        {idx < item.artists.length - 1 && (
                          <span className="text-zinc-600 ml-1">,</span>
                        )}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "venue",
        header: "VENUE",
        cell: ({ row }) => {
          const item = row.original;
          const isPast = isPastEventDateKey(item.date);

          return (
            <div className="flex flex-col py-1 text-xs sm:text-sm">
              <span
                className={cn(
                  "font-semibold line-clamp-1",
                  isPast ? "text-zinc-500 line-through" : "text-zinc-200"
                )}
              >
                {item.venue}
              </span>
              <span className="text-[11px] text-zinc-500 flex items-center gap-1 line-clamp-1">
                <MapPin className="w-3 h-3 shrink-0" />
                {item.location}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: "genre",
        header: "GENRE",
        cell: ({ row }) => {
          const genre = row.original.genre;
          const isPast = isPastEventDateKey(row.original.date);

          return (
            <div className="hidden md:block py-1">
              <span
                className={cn(
                  "inline-block text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider",
                  isPast
                    ? "border-zinc-800 text-zinc-600 bg-zinc-900/40"
                    : "border-zinc-700 text-zinc-300 bg-zinc-900"
                )}
              >
                {genre}
              </span>
            </div>
          );
        },
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const item = row.original;
          const isPast = isPastEventDateKey(item.date);

          if (isPast) {
            return (
              <div className="py-1 text-right">
                <Link
                  href={`/events/${item.slug}`}
                  className="inline-flex items-center text-[11px] font-bold uppercase tracking-wider text-zinc-500 hover:text-white px-2.5 py-1 rounded border border-zinc-800 hover:border-zinc-600 transition-colors"
                >
                  <History className="w-3 h-3 mr-1" />
                  Details
                </Link>
              </div>
            );
          }

          if (item.ticket_link) {
            return (
              <div className="py-1 text-right">
                <a
                  href={item.ticket_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center text-[11px] font-bold uppercase tracking-wider bg-[#7CFC00] hover:bg-[#7CFC00]/90 text-black px-2.5 sm:px-3 py-1 rounded transition-colors shadow-sm"
                >
                  <Ticket className="w-3 h-3 mr-1" />
                  Tickets
                </a>
              </div>
            );
          }

          return (
            <div className="py-1 text-right">
              <Link
                href={`/events/${item.slug}`}
                className="inline-flex items-center text-[11px] font-bold uppercase tracking-wider border border-[#7CFC00]/50 text-[#7CFC00] hover:bg-[#7CFC00] hover:text-black px-2.5 sm:px-3 py-1 rounded transition-colors"
              >
                View
              </Link>
            </div>
          );
        },
      },
    ],
    [todayKey]
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      globalFilter,
      sorting,
    },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: compact ? (limit || 8) : 20,
      },
    },
  });

  const genres = ["ALL", "HARDCORE & ROCK", "HIP-HOP & R&B", "EDM", "COUNTRY", "OTHER"];

  return (
    <div className={cn("w-full bg-[#0D0D0D] border border-zinc-800 rounded-xl overflow-hidden shadow-2xl", className)}>
      {/* Header Controls */}
      {showFilters && (
        <div className="p-4 border-b border-zinc-800/80 bg-zinc-950/60 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Status Segmented Tabs */}
          <div className="inline-flex rounded-lg border border-zinc-800 bg-zinc-900/80 p-1">
            <button
              onClick={() => setStatusFilter("all")}
              className={cn(
                "px-3 py-1 text-xs font-bold uppercase tracking-wider rounded transition-colors",
                statusFilter === "all"
                  ? "bg-[#7CFC00] text-black"
                  : "text-zinc-400 hover:text-white"
              )}
            >
              All Shows ({events.length})
            </button>
            <button
              onClick={() => setStatusFilter("upcoming")}
              className={cn(
                "px-3 py-1 text-xs font-bold uppercase tracking-wider rounded transition-colors",
                statusFilter === "upcoming"
                  ? "bg-[#7CFC00] text-black"
                  : "text-zinc-400 hover:text-white"
              )}
            >
              Upcoming ({events.filter((e) => !isPastEventDateKey(e.date)).length})
            </button>
            <button
              onClick={() => setStatusFilter("past")}
              className={cn(
                "px-3 py-1 text-xs font-bold uppercase tracking-wider rounded transition-colors",
                statusFilter === "past"
                  ? "bg-[#7CFC00] text-black"
                  : "text-zinc-400 hover:text-white"
              )}
            >
              Past ({events.filter((e) => isPastEventDateKey(e.date)).length})
            </button>
          </div>

          {/* Search Input */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              value={globalFilter ?? ""}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder="Search band, venue, city..."
              className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-[#7CFC00] transition-colors"
            />
          </div>

          {onOpenSubmitModal && (
            <button
              onClick={onOpenSubmitModal}
              className="px-3 py-1.5 bg-zinc-800 hover:bg-[#7CFC00] text-zinc-200 hover:text-black font-bold text-xs uppercase tracking-wider rounded-lg border border-zinc-700 hover:border-[#7CFC00] transition-colors shrink-0 cursor-pointer"
            >
              + Submit Show
            </button>
          )}
        </div>
      )}

      {/* Genre Pills */}
      {showFilters && (
        <div className="px-4 py-2 bg-zinc-950/40 border-b border-zinc-800/40 flex items-center gap-1.5 overflow-x-auto text-[11px] font-bold">
          <span className="text-zinc-500 uppercase tracking-widest mr-1 text-[10px]">
            Genre:
          </span>
          {genres.map((genre) => (
            <button
              key={genre}
              onClick={() => setSelectedGenre(genre)}
              className={cn(
                "px-2.5 py-0.5 rounded-full border transition-colors whitespace-nowrap uppercase tracking-wider",
                selectedGenre === genre
                  ? "border-[#7CFC00] bg-[#7CFC00]/10 text-[#7CFC00]"
                  : "border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700"
              )}
            >
              {genre}
            </button>
          ))}
        </div>
      )}

      {/* TanStack Table Element */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr
                key={headerGroup.id}
                className="border-b border-zinc-800 bg-zinc-950/80 text-[10px] sm:text-xs font-mono text-zinc-400 uppercase tracking-widest"
              >
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="px-3 sm:px-4 py-3 font-semibold">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => {
                const isPast = isPastEventDateKey(row.original.date);
                return (
                  <tr
                    key={row.id}
                    className={cn(
                      "group transition-colors duration-150 cursor-pointer",
                      isPast
                        ? "bg-zinc-950/30 hover:bg-zinc-900/40 opacity-70 hover:opacity-100"
                        : "bg-[#0D0D0D] hover:bg-zinc-900/60"
                    )}
                    onClick={() => {
                      window.location.href = `/events/${row.original.slug}`;
                    }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-3 sm:px-4 py-2.5 align-middle">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={columns.length}
                  className="h-32 text-center text-zinc-500 text-sm font-medium"
                >
                  No shows match your current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer / Pagination */}
      {!compact && table.getPageCount() > 1 && (
        <div className="p-3 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between text-xs text-zinc-400">
          <div>
            Showing{" "}
            {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{" "}
            {Math.min(
              (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
              filteredData.length
            )}{" "}
            of {filteredData.length} shows
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="px-3 py-1 rounded bg-zinc-900 border border-zinc-800 disabled:opacity-40 hover:border-zinc-600 transition-colors font-bold cursor-pointer"
            >
              Prev
            </button>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="px-3 py-1 rounded bg-zinc-900 border border-zinc-800 disabled:opacity-40 hover:border-zinc-600 transition-colors font-bold cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
