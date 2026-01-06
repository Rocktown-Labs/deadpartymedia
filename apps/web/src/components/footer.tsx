"use client"

import Link from "next/link"
import { Instagram, Youtube, Twitter, Music, Headphones, ExternalLink } from "lucide-react"

export default function Footer() {
  return (
    <>
      {/* Social/Connect Section */}
      <section className="py-20 px-6 border-t border-gray-800">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <div className="text-sm tracking-[0.4em] text-gray-500 mb-4 uppercase font-bold">Stay Connected</div>
            <h2 className="text-4xl font-black tracking-tight">Follow The Scene</h2>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-6 max-w-3xl mx-auto">
            {[
              { icon: Instagram, name: "Instagram" },
              { icon: Youtube, name: "YouTube" },
              { icon: Twitter, name: "Twitter" },
              { icon: Music, name: "Spotify" },
              { icon: Headphones, name: "Apple Music" },
              { icon: ExternalLink, name: "Open Mic" },
            ].map((social) => (
              <a key={social.name} href="#" className="group text-center transition-all duration-300 hover:scale-110">
                <div className="w-16 h-16 mx-auto mb-3 rounded-full border-2 border-gray-800 group-hover:border-[#7CFC00] flex items-center justify-center transition-all duration-300">
                  <social.icon className="w-6 h-6 text-gray-400 group-hover:text-[#7CFC00] transition-colors" />
                </div>
                <span className="text-xs uppercase tracking-wider text-gray-500 group-hover:text-[#7CFC00] font-medium transition-colors">
                  {social.name}
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Footer - Magazine Colophon Style */}
      <footer className="py-12 px-6 border-t border-gray-800">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-3 gap-12 mb-12">
            <div>
              <div className="text-2xl font-black tracking-tighter mb-2">
                <span className="text-[#7CFC00]">DEAD</span> <span className="text-white">PARTY</span>{" "}
                <span className="text-purple-500">MEDIA</span>
              </div>

              <p className="text-sm text-gray-400 leading-relaxed">
                Celebrating and documenting Arkansas's diverse music scene since 2024.
              </p>
            </div>
            <div>
              <h3 className="text-xs tracking-[0.3em] text-gray-500 uppercase font-bold mb-4">Editorial</h3>
              <div className="space-y-2">
                <Link href="/about" className="block text-sm text-gray-400 hover:text-[#7CFC00] transition-colors">
                  About
                </Link>
                <Link href="/writers" className="block text-sm text-gray-400 hover:text-[#7CFC00] transition-colors">
                  Meet Our Writers
                </Link>
                <Link href="/contact" className="block text-sm text-gray-400 hover:text-[#7CFC00] transition-colors">
                  Contact
                </Link>
              </div>
            </div>
            <div>
              <h3 className="text-xs tracking-[0.3em] text-gray-500 uppercase font-bold mb-4">Connect</h3>
              <div className="flex space-x-4">
                <a href="#" className="text-gray-400 hover:text-[#7CFC00] transition-colors">
                  <Instagram className="w-5 h-5" />
                </a>
                <a href="#" className="text-gray-400 hover:text-[#7CFC00] transition-colors">
                  <Youtube className="w-5 h-5" />
                </a>
                <a href="#" className="text-gray-400 hover:text-[#7CFC00] transition-colors">
                  <Twitter className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>
          <div className="pt-8 border-t border-gray-800 flex flex-col md:flex-row items-center justify-between text-xs text-gray-500">
            <span>© 2025 Dead Party Media. All rights reserved.</span>
            <span className="tracking-wider uppercase">Little Rock, Arkansas</span>
          </div>
        </div>
      </footer>
    </>
  )
}
