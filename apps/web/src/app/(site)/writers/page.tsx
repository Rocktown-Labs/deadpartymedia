"use client"

import { useState, useEffect } from "react"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Instagram, Youtube, Twitter } from "lucide-react" // Ensure correct import

export default function WritersPage() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const writers = [
    {
      name: "J.L. Jones",
      category: "Country",
      bio: "Hey, my name is J.L. Jones! I'm a musician, singer and songwriter from Central Arkansas. I love alternative music of all kinds but I'm especially excited about highlighting artists in the alternative Country and Folk genre!",
      cashTag: "$JLJones6",
      instagram: "Find me on Instagram →",
    },
    {
      name: "Gretchen",
      category: "EDM",
      bio: "Hey! My name is Gretchen and I am currently in college studying to become a Journalist with an online emphasis. I want to use my degree to uplift our local music scene and give an unbiased look into the EDM community in Arkansas! I'll be keeping you up-to-date with local shows and artists that you need to keep an eye out for! You can also catch me as rave ref at a rave near you!",
      cashTag: "$GretchenBullinger",
      instagram: "Find me on Instagram →",
    },
  ]

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Header */}
      <header
        className={`fixed top-0 w-full z-50 transition-all duration-300 ${
          isScrolled ? "bg-[#0A0A0A]/95 backdrop-blur-sm border-b border-[#7CFC00]/20" : "bg-transparent"
        }`}
      >
        <nav className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="text-2xl font-bold tracking-wider">
            <Link href="/">
              <span className="text-[#7CFC00]">DEAD</span> <span className="text-[#9400D3]">PARTY</span> MEDIA
            </Link>
          </div>
          <button className="lg:hidden text-white" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            <div className="w-6 h-6 flex flex-col justify-center space-y-1">
              <div
                className={`h-0.5 bg-white transition-all ${isMobileMenuOpen ? "rotate-45 translate-y-1.5" : ""}`}
              ></div>
              <div className={`h-0.5 bg-white transition-all ${isMobileMenuOpen ? "opacity-0" : ""}`}></div>
              <div
                className={`h-0.5 bg-white transition-all ${isMobileMenuOpen ? "-rotate-45 -translate-y-1.5" : ""}`}
              ></div>
            </div>
          </button>

          {/* Mobile Menu */}
          {isMobileMenuOpen && (
            <div className="absolute top-full left-0 right-0 bg-[#0A0A0A] border-t border-[#7CFC00]/20 lg:hidden">
              <div className="flex flex-col space-y-4 p-6">
                <Link href="/country" className="hover:text-[#7CFC00] transition-colors font-medium text-sm">
                  COUNTRY
                </Link>
                <Link href="/edm" className="hover:text-[#7CFC00] transition-colors font-medium text-sm">
                  EDM
                </Link>
                <Link href="/hardcore" className="hover:text-[#7CFC00] transition-colors font-medium text-sm">
                  HARDCORE & ROCK
                </Link>
                <Link href="/hip-hop-r-b" className="hover:text-[#7CFC00] transition-colors font-medium text-sm">
                  HIP-HOP & R&B
                </Link>
                <Link href="/other" className="hover:text-[#7CFC00] transition-colors font-medium text-sm">
                  OTHER
                </Link>
                <Link href="/events" className="hover:text-[#7CFC00] transition-colors font-medium text-sm">
                  EVENTS
                </Link>
                <Link href="/artists" className="hover:text-[#7CFC00] transition-colors font-medium text-sm">
                  ARTISTS
                </Link>
              </div>
            </div>
          )}
          <div className="hidden lg:flex space-x-8">
            <Link href="/country" className="hover:text-[#7CFC00] transition-colors font-medium text-sm">
              COUNTRY
            </Link>
            <Link href="/edm" className="hover:text-[#7CFC00] transition-colors font-medium text-sm">
              EDM
            </Link>
            <Link href="/hardcore" className="hover:text-[#7CFC00] transition-colors font-medium text-sm">
              HARDCORE & ROCK
            </Link>
            <Link href="/hip-hop-r-b" className="hover:text-[#7CFC00] transition-colors font-medium text-sm">
              HIP-HOP & R&B
            </Link>
            <Link href="/other" className="hover:text-[#7CFC00] transition-colors font-medium text-sm">
              OTHER
            </Link>
            <Link href="/events" className="hover:text-[#7CFC00] transition-colors font-medium text-sm">
              EVENTS
            </Link>
            <Link href="/artists" className="hover:text-[#7CFC00] transition-colors font-medium text-sm">
              ARTISTS
            </Link>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="pt-24 pb-20">
        <div className="container mx-auto px-6 max-w-4xl">
          {/* Back Button */}
          <Link href="/" className="inline-flex items-center text-[#7CFC00] hover:text-[#7CFC00]/80 mb-8">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>

          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-6xl font-black leading-tight mb-8">Meet Our Writers!</h1>
            <div className="w-24 h-1 bg-[#7CFC00] mx-auto mb-8"></div>
            <p className="text-xl text-gray-300 mb-4 font-medium">Dead Party Media</p>
            <p className="text-lg text-gray-400">
              From all around Arkansas, meet our team of writers that want to keep YOU up-to-date with all things local
              music.
            </p>
          </div>

          <div className="space-y-16">
            {writers.map((writer, index) => (
              <div key={index} className="border-b border-gray-800 pb-16 last:border-b-0">
                <h2 className="text-2xl font-bold mb-4">
                  {writer.category} – {writer.name}
                </h2>
                <p className="text-gray-300 leading-relaxed mb-4">{writer.bio}</p>
                <p className="text-gray-400 mb-2">Cash tag: {writer.cashTag}</p>
                <a href="#" className="text-[#7CFC00] hover:text-[#7CFC00]/80 transition-colors">
                  {writer.instagram}
                </a>
              </div>
            ))}

            <div className="border-b border-gray-800 pb-16">
              <h2 className="text-2xl font-bold mb-4">Hardcore & Rock –</h2>
              <p className="text-gray-400">Coming Soon!</p>
            </div>

            <div className="border-b border-gray-800 pb-16 last:border-b-0">
              <h2 className="text-2xl font-bold mb-4">Hip-Hop & R&B –</h2>
              <p className="text-gray-400">Coming Soon!</p>
            </div>
          </div>
        </div>
      </main>

   
    </div>
  )
}
