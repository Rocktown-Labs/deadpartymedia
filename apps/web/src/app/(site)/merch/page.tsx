"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Filter } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { getProducts } from "@/lib/fourthwall"
import type { Product } from "@/lib/types"

export default function MerchPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("All")
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadProducts() {
      try {
        console.log("Starting to load products...")
        const fetchedProducts = await getProducts("USD")
        console.log("Products loaded:", fetchedProducts.length)
        setProducts(fetchedProducts)
      } catch (error) {
        console.error("Error loading products:", error)
        // Set empty array on error so page still renders
        setProducts([])
      } finally {
        setLoading(false)
      }
    }
    loadProducts()
  }, [])

  const categories = ["All", ...Array.from(new Set(products.map((p) => p.title.split(" ")[0])))]

  const filteredItems =
    selectedCategory === "All" ? products : products.filter((item) => item.title.startsWith(selectedCategory))

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🛍️</div>
          <p className="text-gray-400 text-lg">Loading merch...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <main className="pt-40 pb-20">
        <div className="container mx-auto px-6 max-w-7xl">
          <Link
            href="/"
            className="inline-flex items-center text-[#7CFC00] hover:text-[#7CFC00]/80 mb-8 transition-all duration-300 transform hover:scale-110 animate-fadeInUp"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>

          <div className="mb-16 animate-slideInFromLeft">
            <div className="flex items-center mb-6">
              <h1 className="text-5xl font-black tracking-wider">MERCH</h1>
              <div className="ml-8 w-32 h-1 bg-[#7CFC00] animate-expandWidth"></div>
            </div>
            <p className="text-xl text-gray-400 animate-fadeInUp" style={{ animationDelay: "0.3s" }}>
              Official Dead Party Media merchandise - rep Arkansas music culture
            </p>
          </div>

          <div className="flex items-center gap-4 mb-12 overflow-x-auto pb-2">
            <Filter className="w-5 h-5 text-gray-400 flex-shrink-0" />
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-6 py-3 rounded-lg font-bold tracking-wider uppercase text-sm whitespace-nowrap transition-all ${
                  selectedCategory === category
                    ? "bg-[#7CFC00] text-black"
                    : "bg-[#111111] text-gray-400 hover:text-white border border-gray-800 hover:border-[#7CFC00]"
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredItems
              .filter((product) => product.handle) // Only show products with valid handles
              .map((product) => (
              <Link key={product.id} href={`/merch/${product.handle}`}>
                <div className="border border-gray-800 rounded-lg overflow-hidden hover:border-[#7CFC00]/50 transition-colors group cursor-pointer">
                  <div className="relative h-96 overflow-hidden bg-black">
                    <Image
                      src={product.featuredImage.url || "/placeholder.svg"}
                      alt={product.title}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                    <div className="absolute top-4 left-4">
                      <div className="bg-[#9400D3] text-white px-4 py-2 font-black text-xs tracking-wider">MERCH</div>
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-black mb-2 group-hover:text-[#7CFC00] transition-colors">
                      {product.title}
                    </h3>
                    <p className="text-sm text-gray-400 mb-4 line-clamp-2">{product.description}</p>
                    {product.variants.length > 1 && (
                      <div className="mb-4">
                        <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                          {product.variants.length} variants available
                        </div>
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-800">
                      <div className="text-2xl font-black text-[#7CFC00]">${product.variants[0]?.price.amount}</div>
                      <div className="text-xs font-bold tracking-wider uppercase text-[#7CFC00] flex items-center">
                        <span>View Details</span>
                        <span className="ml-2">→</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {filteredItems.length === 0 && !loading && (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">🛍️</div>
              <p className="text-gray-400 text-lg mb-4">
                {products.length === 0
                  ? "No products available at the moment. Check back soon!"
                  : "No items found in this category."}
              </p>
              {products.length === 0 && (
                <p className="text-sm text-gray-500">
                  Products will appear here once they're added to your Fourthwall store.
                </p>
              )}
            </div>
          )}
        </div>
      </main>

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideInFromLeft {
          from {
            opacity: 0;
            transform: translateX(-50px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes expandWidth {
          from {
            width: 0;
          }
          to {
            width: 8rem;
          }
        }

        .animate-fadeInUp {
          animation: fadeInUp 0.8s ease-out forwards;
        }

        .animate-slideInFromLeft {
          animation: slideInFromLeft 0.8s ease-out forwards;
        }

        .animate-expandWidth {
          animation: expandWidth 1s ease-out forwards;
        }
      `}</style>
    </div>
  )
}
