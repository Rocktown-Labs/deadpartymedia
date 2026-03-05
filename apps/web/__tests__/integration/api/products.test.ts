import { GET } from "@/app/api/products/route";
import type { NextRequest } from "next/server";
import { getProducts } from "@/lib/fourthwall";

const toNextRequest = (request: Request): NextRequest => request as unknown as NextRequest;

vi.mock<typeof import("@/lib/fourthwall")>(import("@/lib/fourthwall"), () => ({
  getProducts: vi.fn(),
}));

describe("get /api/products", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses default currency and limit", async () => {
    vi.mocked(getProducts).mockResolvedValueOnce([{ id: "p1", title: "Default Product" } as any]);

    const response = await GET(toNextRequest(new Request("http://localhost:3001/api/products")));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(getProducts).toHaveBeenCalledWith("USD", 100);
    expect(data).toStrictEqual([{ id: "p1", title: "Default Product" }]);
  });

  it("normalizes currency and clamps oversized limits", async () => {
    vi.mocked(getProducts).mockResolvedValueOnce([{ id: "p2", title: "Clamped Product" } as any]);

    const response = await GET(
      toNextRequest(new Request("http://localhost:3001/api/products?currency=cad&limit=1000")),
    );

    expect(response.status).toBe(200);
    expect(getProducts).toHaveBeenCalledWith("CAD", 100);
  });

  it("falls back to defaults when params are invalid", async () => {
    vi.mocked(getProducts).mockResolvedValueOnce([]);

    const response = await GET(
      toNextRequest(new Request("http://localhost:3001/api/products?currency=invalid&limit=0")),
    );

    expect(response.status).toBe(200);
    expect(getProducts).toHaveBeenCalledWith("USD", 100);
  });
});
