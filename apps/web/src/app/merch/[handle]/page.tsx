import { Gallery } from "@/components/product/gallery";
import { ProductProvider } from "@/components/product/product-context";
import { ProductDescription } from "@/components/product/product-description";
import { getMusicApi } from "@/lib/api.server";
import { getProduct } from "@/lib/fourthwall";
import type { PageMetadata as Metadata } from "@/lib/page-head";
import { getAbsoluteUrl, getImageUrl, getSiteDefaults, sanitizeDescription } from "@/lib/seo";
import type { Product } from "@/lib/types";
import { readResponse } from "@dpmedia/api-client";
import { Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { ArrowLeft } from "lucide-react";
import { cache } from "react";
export const loadPage = createServerFn({ method: "GET" })
  .validator((input: { params: Record<string, string>; search: Record<string, string> }) => input)
  .handler(async ({ data: input }) =>
    readResponse(
      await getMusicApi().pages["merch"][":handle"].$get({
        param: { handle: input.params.handle },
        query: input.search,
      }),
    ),
  );

interface ProductPageProps {
  params: Promise<{ handle: string }>;
}

const NOT_FOUND_METADATA: Metadata = {
  description: "The merch item you're looking for could not be found.",
  title: "Merch Item Not Found",
};

const buildProductMetadata = (product: Product): Metadata => {
  const { siteName } = getSiteDefaults();
  const fullTitle = `${product.title} | ${siteName}`;
  const description = sanitizeDescription(
    product.descriptionHtml || product.description,
    `Shop ${product.title} from ${siteName}.`,
  );
  const url = getAbsoluteUrl(`/merch/${product.handle}`);
  const imageUrl = getImageUrl(product.featuredImage.url);

  return {
    alternates: {
      canonical: url,
    },
    description,
    openGraph: {
      description,
      images: [{ alt: product.title, height: 630, url: imageUrl, width: 1200 }],
      locale: "en_US",
      siteName,
      title: fullTitle,
      type: "website",
      url,
    },
    title: product.title,
    twitter: {
      card: "summary_large_image",
      description,
      images: [imageUrl],
      title: fullTitle,
    },
  };
};

const getMerchProduct = cache(
  async (handle: string): Promise<Product | undefined> => getProduct(handle, "USD"),
);

export const generateMetadata = async ({ params }: ProductPageProps): Promise<Metadata> => {
  const { handle } = await params;

  if (!handle) {
    return NOT_FOUND_METADATA;
  }

  const product = await getMerchProduct(handle);
  return product ? buildProductMetadata(product) : NOT_FOUND_METADATA;
};

export default function ProductPage({ data }: { data: Awaited<ReturnType<typeof loadPage>> }) {
  const { product, initialState } = data;
  return (
    <ProductProvider initialState={initialState}>
      <div className="min-h-screen bg-[#0A0A0A] text-white">
        <main className="pt-40 pb-20">
          <div className="container mx-auto px-6">
            <div className="max-w-7xl">
              <Link
                to="/merch"
                className="inline-flex items-center text-[#7CFC00] hover:text-[#7CFC00]/80 mb-8 transition-all duration-300 transform hover:scale-110"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Merch
              </Link>

              <div className="grid grid-cols-1 rounded-lg border border-gray-800 bg-[#0A0A0A] p-8 md:p-12 lg:grid-cols-[minmax(0,2fr)_minmax(18rem,0.9fr)] lg:items-start lg:gap-8">
                <div className="h-full min-w-0 w-full">
                  <Gallery product={product} />
                </div>

                <div className="min-w-0">
                  <ProductDescription product={product} />
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </ProductProvider>
  );
}

export const loadPageMetadata = createServerFn({ method: "GET" })
  .validator((params: { handle: string }) => params)
  .handler(({ data }) => generateMetadata({ params: Promise.resolve(data) }));
