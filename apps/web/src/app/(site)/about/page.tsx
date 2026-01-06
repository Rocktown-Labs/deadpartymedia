"use client"

import { useState, useEffect } from "react"
import { Instagram, Youtube, Twitter, ArrowLeft } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

export default function AboutPage() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

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
            <div className="mb-8">
              <Image
                src="/images/dead-party-logo.png"
                alt="Dead Party Media Logo"
                width={150}
                height={150}
                className="mx-auto"
              />
            </div>
            <h1 className="text-4xl md:text-6xl font-black leading-tight mb-8">What is Dead Party Media?</h1>
            <div className="w-24 h-1 bg-[#7CFC00] mx-auto"></div>
          </div>

          <div className="prose prose-invert prose-lg max-w-none">
            <p className="text-gray-300 leading-relaxed mb-8 text-lg">
              We are your premier destination for all things music in Arkansas! Whether you're looking for local
              rappers, country singers, hardcore bands or EDM DJs, we celebrate it all. Our mission is to shine an equal
              spotlight on every artist in the local scene ensuring everyone gets a chance to be seen and heard!
            </p>

            <p className="text-gray-300 leading-relaxed mb-8 text-lg">
              We are a collective of local artists, writers, journalists, musicians, editors and creatives. We use our
              creativity to highlight local music, artists and events. We'll keep you up-to-date with the local music
              buzz so you're never out of the loop when it comes to local talent!
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-16 px-6 border-t border-gray-800 bg-black text-white">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between mb-8">
            <div className="text-2xl font-bold tracking-wider mb-8 md:mb-0">
              <span className="text-[#7CFC00]">DEAD</span> <span className="text-[#9400D3]">PARTY</span> MEDIA
            </div>
            <div className="flex space-x-6">
              <a href="#" className="hover:text-[#7CFC00] transition-colors">
                <Instagram className="w-6 h-6" />
              </a>
              <a href="#" className="hover:text-[#7CFC00] transition-colors">
                <Youtube className="w-6 h-6" />
              </a>
              <a href="#" className="hover:text-[#7CFC00] transition-colors">
                <Twitter className="w-6 h-6" />
              </a>
            </div>
          </div>
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex space-x-6 text-sm mb-4 md:mb-0">
              <Link href="/about" className="hover:text-[#7CFC00] transition-colors">
                ABOUT
              </Link>
              <Link href="/writers" className="hover:text-[#7CFC00] transition-colors">
                MEET OUR WRITERS
              </Link>
              <Link href="/contact" className="hover:text-[#7CFC00] transition-colors">
                CONTACT US
              </Link>
            </div>
            <div className="text-center text-gray-500 text-sm">© 2024 Dead Party Media. All rights reserved.</div>
          </div>
        </div>
      </footer>
    </div>
  )
}
