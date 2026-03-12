import { NextResponse } from "next/server";
import { getProduct } from "@/lib/fourthwall";

export async function GET(request: Request, { params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const requestUrl = new URL(request.url);
  const currency = requestUrl.searchParams.get("currency") ?? "USD";
  const product = await getProduct(handle, currency);

  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  return NextResponse.json(product, {
    headers: {
      "Cache-Control": "public, max-age=0, s-maxage=86400, stale-while-revalidate=86400",
    },
  });
}
