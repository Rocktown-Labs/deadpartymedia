import { createUrl } from "@/lib/utils";
import {
  getPageRange,
  getTotalPages,
  mergeSearchParams,
} from "@/lib/admin/table-state";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface AdminPaginationProps {
  className?: string;
  page: number;
  pageParam?: string;
  pageSize?: number;
  pathname: string;
  searchParams: URLSearchParams;
  totalItems: number;
}

export function AdminPagination({
  className,
  page,
  pageParam = "page",
  pageSize = 10,
  pathname,
  searchParams,
  totalItems,
}: AdminPaginationProps) {
  const totalPages = getTotalPages(totalItems, pageSize);
  const safePage = Math.min(Math.max(page, 1), totalPages);

  const previousHref = createUrl(
    pathname,
    mergeSearchParams(searchParams, {
      [pageParam]: Math.max(1, safePage - 1),
    }),
  );

  const nextHref = createUrl(
    pathname,
    mergeSearchParams(searchParams, {
      [pageParam]: Math.min(totalPages, safePage + 1),
    }),
  );

  const hasPrevious = safePage > 1;
  const hasNext = safePage < totalPages;
  const range = getPageRange(totalItems, safePage, pageSize);

  return (
    <div className={className}>
      <div className="flex flex-col gap-3 border-t border-gray-800 px-4 py-3 text-sm text-gray-400 md:flex-row md:items-center md:justify-between">
        <p>
          Showing {range.start}-{range.end} of {totalItems}
        </p>
        <Pagination className="mx-0 w-auto justify-end">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href={hasPrevious ? previousHref : "#"}
                className={hasPrevious ? undefined : "pointer-events-none opacity-40"}
              />
            </PaginationItem>
            <PaginationItem>
              <span className="px-3 text-xs text-gray-300">
                Page {safePage} of {totalPages}
              </span>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                href={hasNext ? nextHref : "#"}
                className={hasNext ? undefined : "pointer-events-none opacity-40"}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
}
