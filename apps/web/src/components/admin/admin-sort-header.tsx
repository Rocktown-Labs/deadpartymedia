import Link from "next/link";
import type { Route } from "next";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { createUrl } from "@/lib/utils";
import { getNextSortState, mergeSearchParams, parseSortOrderParam } from '@/lib/admin/table-state';
import type { SortOrder } from '@/lib/admin/table-state';
import { cn } from "@/lib/utils";

interface AdminSortHeaderProps {
  currentOrder: SortOrder;
  currentSort?: string;
  defaultOrder?: SortOrder;
  defaultSort: string;
  field: string;
  label: string;
  orderParam?: string;
  pageParam?: string;
  pathname: string;
  searchParams: URLSearchParams;
  sortParam?: string;
  className?: string;
}

export function AdminSortHeader({
  currentOrder,
  currentSort,
  defaultOrder = "desc",
  defaultSort,
  field,
  label,
  orderParam = "order",
  pageParam = "page",
  pathname,
  searchParams,
  sortParam = "sort",
  className,
}: AdminSortHeaderProps) {
  const effectiveCurrentOrder = parseSortOrderParam(currentOrder, defaultOrder);
  const nextSortState = getNextSortState({
    currentOrder: effectiveCurrentOrder,
    currentSort,
    defaultOrder,
    defaultSort,
    field,
  });

  const nextParams = mergeSearchParams(searchParams, {
    [orderParam]: nextSortState.order,
    [pageParam]: 1,
    [sortParam]: nextSortState.sort,
  });

  const isDefaultActive = !currentSort && field === defaultSort;
  const isFieldActive = currentSort === field || isDefaultActive;

  const activeOrder = currentSort === field ? effectiveCurrentOrder : defaultOrder;

  const Icon = isFieldActive ? (activeOrder === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;

  return (
    <Link
      href={createUrl(pathname, nextParams) as Route}
      className={cn(
        "inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-gray-300 transition-colors hover:text-white",
        isFieldActive ? "text-[#7CFC00] hover:text-[#7CFC00]" : undefined,
        className,
      )}
      aria-label={`Sort by ${label}`}
    >
      <span>{label}</span>
      <Icon className="size-3.5" />
    </Link>
  );
}
