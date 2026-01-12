"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import type { Route } from "next";
import CartModal from "./cart/cart-modal";
import { ChevronDown } from "lucide-react";
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";

// Extract constants for better maintainability
const MUSIC_GENRES = [
  { name: "Country", href: "/country" as Route },
  { name: "EDM", href: "/edm" as Route },
  { name: "Hardcore & Rock", href: "/hardcore" as Route },
  { name: "Hip-Hop & R&B", href: "/hip-hop-r-b" as Route },
  { name: "Other", href: "/other" as Route },
];

// Compute dates outside render for performance
const currentDate = new Date();
const issueDate = currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

export default function Navbar() {
  const [isMusicDropdownOpen, setIsMusicDropdownOpen] = useState(false);

  // Mount-only for global scroll listener (keep if adding scroll effects later)
  useEffect(() => {
    const handleScroll = () => {
      // If needed, add logic here (e.g., setIsScrolled(window.scrollY > 50))
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className="fixed top-0 w-full z-50 bg-[#0A0A0A]/95 backdrop-blur-xl border-b border-gray-800">
      <div className="container mx-auto px-6">
        <div className="py-2 border-b border-gray-800/50 flex items-center justify-between text-xs tracking-widest text-gray-500 px-6">
          <span>
            ISSUE {currentDate.getMonth() + 1}.{currentDate.getFullYear()}
          </span>
          <span className="hidden md:block">{issueDate.toUpperCase()}</span>
          <span className="hidden md:block">ARKANSAS MUSIC</span>
        </div>
        <nav className="py-6 flex items-center justify-between">
          {/* Logo */}
          <div className="flex-1">
            <div className="lg:hidden">
              <Link href="/">
                <Image
                  src="/images/dead-party-logo.png"
                  alt="Dead Party Media"
                  width={50}
                  height={50}
                  className="size-14" // Removed mx-6 to prevent overlap
                />
              </Link>
            </div>
            <div className="hidden lg:block mx-6">
              <Link href="/">
                <div className="text-3xl font-black tracking-tighter">
                  <span className="text-[#7CFC00]">DEAD</span>
                  <span className="text-white"> PARTY</span>
                  <span className="text-purple-500"> MEDIA</span>
                </div>
                <div className="text-[10px] tracking-[0.4em] font-light mt-1 text-foreground">
                  YOUR #1 OUTLET FOR ARKANSAS MUSIC
                </div>
              </Link>
            </div>
          </div>
          {/* Desktop Menu */}
          <div className="hidden lg:flex items-center space-x-8">
            {/* Music Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setIsMusicDropdownOpen(true)}
              onMouseLeave={() => setIsMusicDropdownOpen(false)}
            >
              <Link href="/music">
                <button className="text-sm font-medium tracking-wider uppercase hover:text-[#7CFC00] transition-colors relative group flex items-center gap-1">
                  Music
                  <ChevronDown className="w-4 h-4" />
                  <div className="absolute -bottom-1 left-0 w-0 h-px bg-[#7CFC00] transition-all duration-300 group-hover:w-full" />
                </button>
              </Link>
              {isMusicDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-48 bg-[#0A0A0A] border border-gray-800 rounded-lg shadow-xl py-2">
                  {MUSIC_GENRES.map((genre) => (
                    <Link
                      key={genre.name}
                      href={genre.href}
                      className="block px-4 py-2 text-sm hover:bg-gray-900 hover:text-[#7CFC00] transition-colors"
                    >
                      {genre.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
            <Link
              href="/events"
              className="text-sm font-medium tracking-wider uppercase hover:text-[#7CFC00] transition-colors relative group"
            >
              Events
              <div className="absolute -bottom-1 left-0 w-0 h-px bg-[#7CFC00] transition-all duration-300 group-hover:w-full" />
            </Link>
            <Link
              href="/artists"
              className="text-sm font-medium tracking-wider uppercase hover:text-[#7CFC00] transition-colors relative group"
            >
              Artists
              <div className="absolute -bottom-1 left-0 w-0 h-px bg-[#7CFC00] transition-all duration-300 group-hover:w-full" />
            </Link>
            <Link
              href="/merch"
              className="text-sm font-medium tracking-wider uppercase hover:text-[#7CFC00] transition-colors relative group"
            >
              Merch
              <div className="absolute -bottom-1 left-0 w-0 h-px bg-[#7CFC00] transition-all duration-300 group-hover:w-full" />
            </Link>
            <CartModal />
            <SignedOut>
              <SignInButton mode="modal">
                <button
                  className="flex h-11 items-center justify-center rounded-lg border border-gray-800 hover:border-[#7CFC00] transition-colors cursor-pointer bg-transparent text-white px-4"
                  aria-label="Sign in"
                >
                  <span className="text-xs font-bold tracking-wider uppercase">Sign In</span>
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button
                  className="flex h-11 items-center justify-center rounded-lg border border-gray-800 hover:border-[#7CFC00] transition-colors cursor-pointer bg-[#7CFC00] text-black px-4"
                  aria-label="Get started"
                >
                  <span className="text-xs font-bold tracking-wider uppercase">Get Started</span>
                </button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <div className="hidden lg:block">
                <UserButton
                  appearance={{
                    elements: {
                      avatarBox: "h-11 w-11 border border-gray-800 hover:border-[#7CFC00] rounded-lg",
                      userButtonPopoverCard: "bg-[#0A0A0A] border-gray-800",
                      userButtonPopoverActionButton: "text-white hover:bg-gray-900",
                      userButtonPopoverActionButtonText: "text-white",
                    },
                  }}
                />
              </div>
            </SignedIn>
          </div>
          {/* Mobile Layout - Logo and Cart */}
          <div className="flex items-center gap-2 lg:hidden">
            <CartModal />
          </div>
        </nav>
      </div>
    </header>
  );
}
