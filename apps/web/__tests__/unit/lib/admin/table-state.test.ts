import {
  ADMIN_PAGE_SIZE,
  buildSearchParams,
  getNextSortState,
  getOffsetFromPage,
  mergeSearchParams,
  parsePageParam,
  parseSortOrderParam,
  parseSortParam,
} from "@/lib/admin/table-state";

describe("table-state utilities", () => {
  it("parses page with fallback to 1", () => {
    expect(parsePageParam()).toBe(1);
    expect(parsePageParam("0")).toBe(1);
    expect(parsePageParam("-3")).toBe(1);
    expect(parsePageParam("abc")).toBe(1);
    expect(parsePageParam("4")).toBe(4);
  });

  it("parses sort and order with safe fallbacks", () => {
    const allowed = ["name", "createdAt"] as const;

    expect(parseSortParam("name", allowed, "createdAt")).toBe("name");
    expect(parseSortParam("invalid", allowed, "createdAt")).toBe("createdAt");

    expect(parseSortOrderParam("asc", "desc")).toBe("asc");
    expect(parseSortOrderParam("desc", "asc")).toBe("desc");
    expect(parseSortOrderParam("wat", "desc")).toBe("desc");
  });

  it("cycles sorting from default to asc/desc/default", () => {
    expect(
      getNextSortState({
        currentOrder: "desc",
        currentSort: undefined,
        defaultOrder: "desc",
        defaultSort: "createdAt",
        field: "title",
      }),
    ).toStrictEqual({ order: "asc", sort: "title" });

    expect(
      getNextSortState({
        currentOrder: "desc",
        currentSort: "title",
        defaultOrder: "desc",
        defaultSort: "createdAt",
        field: "title",
      }),
    ).toStrictEqual({});

    expect(
      getNextSortState({
        currentOrder: "asc",
        currentSort: "title",
        defaultOrder: "desc",
        defaultSort: "createdAt",
        field: "title",
      }),
    ).toStrictEqual({ order: "desc", sort: "title" });

    expect(
      getNextSortState({
        currentOrder: "desc",
        currentSort: undefined,
        defaultOrder: "desc",
        defaultSort: "createdAt",
        field: "createdAt",
      }),
    ).toStrictEqual({ order: "asc", sort: "createdAt" });
  });

  it("merges query params while preserving unrelated params", () => {
    const current = buildSearchParams({
      foo: "bar",
      page: "2",
      sort: "title",
    });

    const merged = mergeSearchParams(current, {
      order: "asc",
      page: 1,
      sort: undefined,
    });

    expect(merged.get("foo")).toBe("bar");
    expect(merged.get("page")).toBe("1");
    expect(merged.get("order")).toBe("asc");
    expect(merged.get("sort")).toBeNull();
  });

  it("computes offsets from pages", () => {
    expect(getOffsetFromPage(1, ADMIN_PAGE_SIZE)).toBe(0);
    expect(getOffsetFromPage(2, ADMIN_PAGE_SIZE)).toBe(10);
  });
});
