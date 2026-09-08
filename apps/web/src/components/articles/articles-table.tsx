"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  type ColumnDef,
  flexRender,
} from "@tanstack/react-table";
import type { HomepageArticle } from "@/components/homepage-client";
import { Search, ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ArticlesTableProps {
  articles: HomepageArticle[];
  pageSize?: number;
  className?: string;
  showSearch?: boolean;
}

export function ArticlesTable({
  articles = [],
  pageSize = 5,
  className,
  showSearch = true,
}: ArticlesTableProps) {
  const [globalFilter, setGlobalFilter] = useState("");

  const columns = useMemo<ColumnDef<HomepageArticle>[]>(
    () => [
      {
        id: "article",
        header: "LATEST STORIES",
        cell: ({ row }) => {
          const article = row.original;
          const imageSrc = article.image || article.cover_image || "/placeholder.svg";

          return (
            <div className="flex items-center gap-4 sm:gap-6 py-4">
              {/* Cover Art Thumbnail */}
              <Link
                href={`/article/${article.slug}`}
                className="relative w-20 h-20 sm:w-28 sm:h-28 shrink-0 rounded-lg overflow-hidden bg-zinc-900 border border-zinc-800 hover:border-[#7CFC00]/60 transition-colors group"
              >
                <Image
                  src={imageSrc}
                  alt={article.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </Link>

              {/* Story Details */}
              <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="inline-block text-[10px] font-mono font-bold uppercase tracking-wider text-[#7CFC00] px-2 py-0.5 rounded bg-[#7CFC00]/10 border border-[#7CFC00]/20">
                    {article.category}
                  </span>
                  <span className="text-xs text-zinc-500 font-mono">{article.date}</span>
                </div>

                <Link
                  href={`/article/${article.slug}`}
                  className="font-black text-base sm:text-lg text-white hover:text-[#7CFC00] transition-colors line-clamp-1 sm:line-clamp-2 leading-snug group"
                  title={article.title}
                >
                  {article.title}
                </Link>

                <p className="text-xs sm:text-sm text-zinc-400 line-clamp-1 sm:line-clamp-2 leading-relaxed">
                  {article.excerpt}
                </p>

                <div className="flex items-center justify-between text-xs text-zinc-500 pt-1">
                  <span>
                    By{" "}
                    <span className="text-zinc-300 font-medium">
                      {article.author || "Dead Party Staff"}
                    </span>
                  </span>
                  <Link
                    href={`/article/${article.slug}`}
                    className="text-xs font-bold text-[#7CFC00] hover:underline uppercase tracking-wider shrink-0 flex items-center gap-1 ml-2"
                  >
                    Read Story <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          );
        },
      },
    ],
    [],
  );

  const table = useReactTable({
    data: articles,
    columns,
    state: {
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize,
      },
    },
  });

  const totalArticles = articles.length;
  const pageIndex = table.getState().pagination.pageIndex;
  const pageCount = table.getPageCount();

  return (
    <div
      className={cn(
        "rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden shadow-xl flex flex-col",
        className,
      )}
    >
      {/* Header with Search and Page Indicator */}
      <div className="p-3 sm:p-4 border-b border-zinc-800 bg-zinc-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center justify-between sm:justify-start gap-3">
          <h3 className="text-xs font-mono font-bold tracking-widest text-zinc-400 uppercase">
            Story Archive ({totalArticles})
          </h3>
          <span className="text-[11px] text-zinc-500 font-mono">
            Page {pageIndex + 1} of {Math.max(1, pageCount)}
          </span>
        </div>

        {showSearch && (
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
            <input
              type="text"
              value={globalFilter ?? ""}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder="Filter stories..."
              className="w-full pl-8 pr-3 py-1 text-xs bg-zinc-900 border border-zinc-800 rounded-md text-white placeholder-zinc-500 focus:outline-none focus:border-[#7CFC00] transition-colors"
            />
          </div>
        )}
      </div>

      {/* Table Body */}
      <div className="divide-y divide-zinc-800/80 px-3 sm:px-4">
        {table.getRowModel().rows?.length ? (
          table.getRowModel().rows.map((row) => (
            <div key={row.id} className="transition-colors hover:bg-zinc-900/30">
              {row.getVisibleCells().map((cell) => (
                <React.Fragment key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </React.Fragment>
              ))}
            </div>
          ))
        ) : (
          <div className="h-32 flex items-center justify-center text-center text-xs text-zinc-500 font-mono">
            No matching articles found.
          </div>
        )}
      </div>

      {/* In-Place Pagination Controls */}
      {pageCount > 1 && (
        <div className="p-3 border-t border-zinc-800 bg-zinc-900/40 flex items-center justify-between text-xs font-mono">
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Previous
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: pageCount }).map((_, idx) => (
              <button
                key={idx}
                onClick={() => table.setPageIndex(idx)}
                className={cn(
                  "w-7 h-7 rounded text-xs font-bold transition-colors",
                  pageIndex === idx
                    ? "bg-[#7CFC00] text-black"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-800",
                )}
              >
                {idx + 1}
              </button>
            ))}
          </div>

          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Next <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
