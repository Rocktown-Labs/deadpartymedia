import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProduct } from "@/lib/fourthwall";
import { getAbsoluteUrl, getImageUrl, getSiteDefaults, sanitizeDescription } from "@/lib/seo";
import { Gallery } from "@/components/product/gallery";
import { ProductProvider } from "@/components/product/product-context";
import { ProductDescription } from "@/components/product/product-description";
import type { Product } from "@/lib/types";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

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

const buildInitialVariantState = (product: Product): Record<string, string> => {
  const initialVariant =
    product.variants.find((variant) => variant.availableForSale) || product.variants[0];
  const state: Record<string, string> = {};

  for (const option of initialVariant?.selectedOptions ?? []) {
    state[option.name.toLowerCase()] = option.value;
  }

  return state;
};

export const generateMetadata = async ({ params }: ProductPageProps): Promise<Metadata> => {
  const { handle } = await params;

  if (!handle) {
    return NOT_FOUND_METADATA;
  }

  const product = await getProduct(handle, "USD");
  return product ? buildProductMetadata(product) : NOT_FOUND_METADATA;
};

export default async function ProductPage({ params }: ProductPageProps) {
  const { handle } = await params;

  if (!handle) {
    return notFound();
  }

  const product = await getProduct(handle, "USD");

  if (!product) {
    return notFound();
  }

  const initialState = buildInitialVariantState(product);

  return (
    <ProductProvider initialState={initialState}>
      <div className="min-h-screen bg-[#0A0A0A] text-white">
        <main className="pt-40 pb-20">
          <div className="container mx-auto px-6">
            <div className="max-w-7xl">
              <Link
                href="/merch"
                className="inline-flex items-center text-[#7CFC00] hover:text-[#7CFC00]/80 mb-8 transition-all duration-300 transform hover:scale-110"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Merch
              </Link>

              <div className="flex flex-col rounded-lg border border-gray-800 bg-[#0A0A0A] p-8 md:p-12 lg:flex-row lg:gap-8">
                <div className="h-full w-full basis-full lg:basis-4/6">
                  <Gallery product={product} />
                </div>

                <div className="basis-full lg:basis-2/6">
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
