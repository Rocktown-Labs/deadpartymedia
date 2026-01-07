import { notFound } from "next/navigation"
import { getProduct } from "@/lib/fourthwall"
import { Gallery } from "@/components/product/gallery"
import { ProductProvider } from "@/components/product/product-context"
import { ProductDescription } from "@/components/product/product-description"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default async function ProductPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params
  
  if (!handle) {
    return notFound()
  }
  
  const product = await getProduct(handle, "USD")

  if (!product) return notFound()

  return (
    <ProductProvider>
      <div className="min-h-screen bg-[#0A0A0A] text-white">
        <main className="pt-40 pb-20">
          <div className="container mx-auto px-6 max-w-7xl">
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
        </main>
      </div>
    </ProductProvider>
  )
}
