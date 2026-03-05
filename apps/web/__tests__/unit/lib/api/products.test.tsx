import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { buildProductsApiPath, buildProductsQueryKey, useProducts } from "@/lib/api/products";

describe("products api utilities", () => {
  it("builds the default products endpoint", () => {
    expect(buildProductsApiPath()).toBe("/api/products?currency=USD&limit=100");
  });

  it("normalizes currency and limit values", () => {
    expect(buildProductsApiPath({ currency: "cad", limit: 7 })).toBe(
      "/api/products?currency=CAD&limit=7",
    );
    expect(buildProductsApiPath({ currency: "toolong", limit: 999 })).toBe(
      "/api/products?currency=USD&limit=100",
    );
  });

  it("builds query keys with normalized values", () => {
    expect(buildProductsQueryKey({ currency: "eur", limit: 12 })).toStrictEqual([
      "products",
      "EUR",
      12,
    ]);
    expect(buildProductsQueryKey({ currency: "invalid", limit: -1 })).toStrictEqual([
      "products",
      "USD",
      100,
    ]);
  });
});

describe(useProducts, () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses a query key that includes currency and limit and fetches the matching endpoint", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json([{ id: "product-1", title: "Shirt" }], {
        headers: {
          "Content-Type": "application/json",
        },
        status: 200,
      }),
    );

    vi.stubGlobal("fetch", fetchMock);

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useProducts({ currency: "cad", limit: 7 }), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBeTruthy();
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const firstCall = fetchMock.mock.calls[0];
    expect(firstCall?.[0]).toBe("/api/products?currency=CAD&limit=7");

    const keys = queryClient
      .getQueryCache()
      .getAll()
      .map((query) => query.queryKey);

    expect(keys).toContainEqual(["products", "CAD", 7]);
  });
});
