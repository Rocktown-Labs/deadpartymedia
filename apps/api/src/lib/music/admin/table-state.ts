export const ADMIN_PAGE_SIZE = 10;

export type SortOrder = "asc" | "desc";

export function parsePageParam(value?: string): number {
  if (!value) {
    return 1;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }

  return parsed;
}

export function parseSortParam<TSort extends string>(
  value: string | undefined,
  allowed: readonly TSort[],
  fallback: TSort,
): TSort {
  if (!value) {
    return fallback;
  }

  if (allowed.includes(value as TSort)) {
    return value as TSort;
  }

  return fallback;
}

export function parseSortOrderParam(
  value: string | undefined,
  fallback: SortOrder = "desc",
): SortOrder {
  if (value === "asc" || value === "desc") {
    return value;
  }

  return fallback;
}

export function getOffsetFromPage(page: number, pageSize = ADMIN_PAGE_SIZE): number {
  return (Math.max(page, 1) - 1) * pageSize;
}

export function getTotalPages(totalItems: number, pageSize = ADMIN_PAGE_SIZE): number {
  if (totalItems <= 0) {
    return 1;
  }

  return Math.max(1, Math.ceil(totalItems / pageSize));
}

export function getPageRange(totalItems: number, page: number, pageSize = ADMIN_PAGE_SIZE) {
  if (totalItems <= 0) {
    return { end: 0, start: 0 };
  }

  const safePage = Math.max(page, 1);
  const start = (safePage - 1) * pageSize + 1;
  const end = Math.min(safePage * pageSize, totalItems);

  return {
    end,
    start,
  };
}

export function buildSearchParams(
  input: Record<string, string | string[] | undefined>,
): URLSearchParams {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(input)) {
    if (typeof value === "string" && value.length > 0) {
      params.set(key, value);
      continue;
    }

    if (Array.isArray(value) && value.length > 0 && value[0]) {
      params.set(key, value[0]);
    }
  }

  return params;
}

export function mergeSearchParams(
  current: URLSearchParams,
  updates: Record<string, string | number | null | undefined>,
): URLSearchParams {
  const next = new URLSearchParams(current.toString());

  for (const [key, value] of Object.entries(updates)) {
    if (value === null || value === undefined || value === "") {
      next.delete(key);
      continue;
    }

    next.set(key, String(value));
  }

  return next;
}

export function getNextSortState(options: {
  currentOrder: SortOrder;
  currentSort?: string;
  defaultOrder?: SortOrder;
  defaultSort: string;
  field: string;
}): { order?: SortOrder; sort?: string } {
  const { currentOrder, currentSort, defaultOrder = "desc", defaultSort, field } = options;

  const isDefaultState = !currentSort;
  const isActiveField = currentSort === field;

  if (isDefaultState) {
    if (field === defaultSort) {
      return { order: defaultOrder === "asc" ? "desc" : "asc", sort: field };
    }

    return { order: "asc", sort: field };
  }

  if (!isActiveField) {
    return { order: "asc", sort: field };
  }

  if (currentOrder === "asc") {
    return { order: "desc", sort: field };
  }

  return {};
}
