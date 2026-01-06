"use client"

import { useState, useEffect } from "react"
import { Instagram, Youtube, Twitter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import Link from "next/link"

export default function ContactPage() {
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
                <a href="#" className="hover:text-[#7CFC00] transition-colors font-medium tracking-wide text-sm">
                  COUNTRY
                </a>
                <a href="#" className="hover:text-[#7CFC00] transition-colors font-medium tracking-wide text-sm">
                  EDM
                </a>
                <a href="#" className="hover:text-[#7CFC00] transition-colors font-medium tracking-wide text-sm">
                  HARDCORE & ROCK
                </a>
                <a href="#" className="hover:text-[#7CFC00] transition-colors font-medium tracking-wide text-sm">
                  HIP-HOP & R&B
                </a>
                <a href="#" className="hover:text-[#7CFC00] transition-colors font-medium tracking-wide text-sm">
                  OTHER
                </a>
                <a href="#" className="hover:text-[#7CFC00] transition-colors font-medium tracking-wide text-sm">
                  EVENTS
                </a>
                <Link
                  href="/writers"
                  className="hover:text-[#7CFC00] transition-colors font-medium tracking-wide text-sm"
                >
                  MEET OUR WRITERS!
                </Link>
                <Link
                  href="/about"
                  className="hover:text-[#7CFC00] transition-colors font-medium tracking-wide text-sm"
                >
                  ABOUT
                </Link>
              </div>
            </div>
          )}
          <div className="hidden lg:flex space-x-6">
            <a href="#" className="hover:text-[#7CFC00] transition-colors font-medium tracking-wide text-sm">
              COUNTRY
            </a>
            <a href="#" className="hover:text-[#7CFC00] transition-colors font-medium tracking-wide text-sm">
              EDM
            </a>
            <a href="#" className="hover:text-[#7CFC00] transition-colors font-medium tracking-wide text-sm">
              HARDCORE & ROCK
            </a>
            <a href="#" className="hover:text-[#7CFC00] transition-colors font-medium tracking-wide text-sm">
              HIP-HOP & R&B
            </a>
            <a href="#" className="hover:text-[#7CFC00] transition-colors font-medium tracking-wide text-sm">
              OTHER
            </a>
            <a href="#" className="hover:text-[#7CFC00] transition-colors font-medium tracking-wide text-sm">
              EVENTS
            </a>
            <Link href="/writers" className="hover:text-[#7CFC00] transition-colors font-medium tracking-wide text-sm">
              MEET OUR WRITERS!
            </Link>
            <Link href="/about" className="hover:text-[#7CFC00] transition-colors font-medium tracking-wide text-sm">
              ABOUT
            </Link>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="pt-24 pb-20">
        <div className="container mx-auto px-6 max-w-2xl">
          <div className="text-center mb-16">
            <div className="w-24 h-1 bg-[#7CFC00] mx-auto mb-8"></div>
            <h1 className="text-4xl md:text-6xl font-black leading-tight mb-8">Contact us</h1>
            <p className="text-lg text-gray-400">
              Have a comment, question or submission? Then you've found the right place!
            </p>
          </div>

          <Card className="bg-[#111111] border-gray-800 p-8">
            <form className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <input
                    type="text"
                    placeholder="First name (required)"
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-gray-700 rounded focus:border-[#7CFC00] focus:outline-none text-white placeholder-gray-500"
                    required
                  />
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="Last name (required)"
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-gray-700 rounded focus:border-[#7CFC00] focus:outline-none text-white placeholder-gray-500"
                    required
                  />
                </div>
              </div>
              <div>
                <input
                  type="email"
                  placeholder="Email (required)"
                  className="w-full px-4 py-3 bg-[#0A0A0A] border border-gray-700 rounded focus:border-[#7CFC00] focus:outline-none text-white placeholder-gray-500"
                  required
                />
              </div>
              <div>
                <textarea
                  placeholder="Message"
                  rows={6}
                  className="w-full px-4 py-3 bg-[#0A0A0A] border border-gray-700 rounded focus:border-[#7CFC00]  focus:outline-none text-white placeholder-gray-500 resize-none"
                ></textarea>
              </div>
              <div className="text-center">
                <Button className="bg-red-600 hover:bg-red-700 text-white font-bold px-8 py-3 rounded">Send</Button>
              </div>
            </form>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-16 px-6 border-t border-gray-800 bg-black">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="mb-8 md:mb-0">
              <div className="text-2xl font-bold tracking-wider mb-2">
                <span className="text-[#7CFC00]">DEAD</span> <span className="text-[#9400D3]">PARTY</span> MEDIA
              </div>
              <p className="text-gray-400 text-sm italic">Arkansas' Diverse Music Media Outlet</p>
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
        </div>
      </footer>
    </div>
  )
}
