import { AccountMenu, AuthDialog } from "@/components/auth";
import { useMusicSession } from "@/lib/auth-client";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { ChevronDown, LayoutDashboard } from "lucide-react";
import { CartTrigger } from "./cart/cart-modal";

import { getDashboardRouteFromMetadata } from "@/lib/utils/dashboard";

// Extract constants for better maintainability
const MUSIC_GENRES = [
  { href: "/country", name: "Country" },
  { href: "/edm", name: "EDM" },
  { href: "/hardcore", name: "Hardcore & Rock" },
  { href: "/hip-hop-r-b", name: "Hip-Hop & R&B" },
  { href: "/other", name: "Other" },
];

// Serialize the request clock through the root loader: Workers module evaluation
// happens outside a request, where Date is the Unix epoch.
export default function Navbar({ issuedAt = 0 }: { issuedAt?: number }) {
  const currentDate = new Date(issuedAt);
  const issueDate = currentDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const [isArticlesDropdownOpen, setIsArticlesDropdownOpen] = useState(false);
  const { session: user } = useMusicSession();
  const dashboardHref: string = getDashboardRouteFromMetadata(user?.roles[0]);

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
        <div className="py-2 border-b border-gray-800/50 flex items-center justify-between text-xs tracking-widest text-gray-500">
          <span>
            ISSUE {currentDate.getUTCMonth() + 1}.{currentDate.getUTCFullYear()}
          </span>
          <span className="hidden md:block">{issueDate.toUpperCase()}</span>
          <span className="hidden md:block">ARKANSAS MUSIC</span>
        </div>
        {/* Mobile Bar (< lg) */}
        <div className="flex items-center justify-between py-4 lg:hidden">
          <Link to="/">
            <img
              src="/images/dead-party-logo.png"
              alt="Dead Party Media"
              width={48}
              height={48}
              className="size-12"
            />
          </Link>
          <div className="flex items-center gap-2">
            <CartTrigger />
            {!user ? (
              <>
                <div className="flex items-center gap-2">
                  <AuthDialog mode="sign-in">
                    <button
                      type="button"
                      className="flex h-10 items-center justify-center rounded-lg border border-gray-800 hover:border-[#7CFC00] transition-colors cursor-pointer bg-transparent text-white px-3"
                      aria-label="Sign in"
                    >
                      <span className="text-xs font-bold tracking-wider uppercase">Sign In</span>
                    </button>
                  </AuthDialog>
                  <AuthDialog mode="sign-up">
                    <button
                      type="button"
                      className="flex h-10 items-center justify-center rounded-lg border border-gray-800 hover:border-[#7CFC00] transition-colors cursor-pointer bg-[#7CFC00] text-black px-3"
                      aria-label="Sign up"
                    >
                      <span className="text-xs font-bold tracking-wider uppercase">Sign Up</span>
                    </button>
                  </AuthDialog>
                </div>
              </>
            ) : null}
            {user ? (
              <>
                <div className="flex items-center gap-2">
                  <Link
                    to={dashboardHref}
                    className="flex h-10 items-center justify-center rounded-lg border border-gray-800 hover:border-[#7CFC00] transition-colors bg-transparent text-white px-3"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    <span className="ml-2 text-xs font-bold tracking-wider uppercase">
                      Dashboard
                    </span>
                  </Link>
                  <AccountMenu />
                </div>
              </>
            ) : null}
          </div>
        </div>

        {/* Desktop Header: Stacked layout (>= lg) */}
        <div className="hidden lg:block">
          {/* Top Row: Masthead (Logo & Subtitle) + Actions */}
          <div className="py-3.5 flex items-center justify-between gap-6">
            <Link to="/" className="group inline-flex flex-col">
              <div className="text-2xl xl:text-3xl font-black tracking-tighter whitespace-nowrap leading-none">
                <span className="text-[#7CFC00]">DEAD</span>
                <span className="text-white"> PARTY</span>
                <span className="text-purple-500"> MEDIA</span>
              </div>
              <div className="text-[10px] tracking-[0.28em] xl:tracking-[0.32em] font-light mt-1 text-zinc-400 whitespace-nowrap leading-none">
                YOUR #1 OUTLET FOR ARKANSAS MUSIC
              </div>
            </Link>

            {/* Desktop Actions */}
            <div className="flex items-center gap-3">
              <CartTrigger />
              {!user ? (
                <>
                  <div className="flex items-center gap-2">
                    <AuthDialog mode="sign-in">
                      <button
                        type="button"
                        className="flex h-10 items-center justify-center rounded-lg border border-gray-800 hover:border-[#7CFC00] transition-colors cursor-pointer bg-transparent text-white px-3"
                        aria-label="Sign in"
                      >
                        <span className="text-xs font-bold tracking-wider uppercase">Sign In</span>
                      </button>
                    </AuthDialog>
                    <AuthDialog mode="sign-up">
                      <button
                        type="button"
                        className="flex h-10 items-center justify-center rounded-lg border border-gray-800 hover:border-[#7CFC00] transition-colors cursor-pointer bg-[#7CFC00] text-black px-3"
                        aria-label="Get started"
                      >
                        <span className="text-xs font-bold tracking-wider uppercase">
                          Get Started
                        </span>
                      </button>
                    </AuthDialog>
                  </div>
                </>
              ) : null}
              {user ? (
                <>
                  <div className="flex items-center gap-2">
                    <Link
                      to={dashboardHref}
                      className="flex h-10 items-center justify-center rounded-lg border border-gray-800 hover:border-[#7CFC00] transition-colors bg-transparent text-white px-3"
                    >
                      <LayoutDashboard className="h-4 w-4" />
                      <span className="ml-2 text-xs font-bold tracking-wider uppercase">
                        Dashboard
                      </span>
                    </Link>
                    <AccountMenu />
                  </div>
                </>
              ) : null}
            </div>
          </div>

          {/* Bottom Row: Menu Navigation */}
          <nav className="border-t border-gray-800/60 py-2.5 flex items-center justify-center gap-8">
            <Link
              to="/music"
              className="text-sm font-medium tracking-wider uppercase hover:text-[#7CFC00] transition-colors relative group"
            >
              Music
              <div className="absolute -bottom-1 left-0 w-0 h-px bg-[#7CFC00] transition-all duration-300 group-hover:w-full" />
            </Link>

            {/* Articles Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setIsArticlesDropdownOpen(true)}
              onMouseLeave={() => setIsArticlesDropdownOpen(false)}
            >
              <Link
                to={"/articles"}
                className="text-sm font-medium tracking-wider uppercase hover:text-[#7CFC00] transition-colors relative group flex items-center gap-1"
              >
                Articles
                <ChevronDown className="w-4 h-4" />
                <div className="absolute -bottom-1 left-0 w-0 h-px bg-[#7CFC00] transition-all duration-300 group-hover:w-full" />
              </Link>
              {isArticlesDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-48 bg-[#0A0A0A] border border-gray-800 rounded-lg shadow-xl py-2 z-50">
                  <Link
                    to={"/articles"}
                    className="block px-4 py-2 text-sm font-bold text-[#7CFC00] hover:bg-gray-900 transition-colors border-b border-gray-800/60 mb-1"
                  >
                    All Articles
                  </Link>
                  {MUSIC_GENRES.map((genre) => (
                    <Link
                      key={genre.name}
                      to={genre.href}
                      className="block px-4 py-2 text-sm hover:bg-gray-900 hover:text-[#7CFC00] transition-colors"
                    >
                      {genre.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <Link
              to="/events"
              className="text-sm font-medium tracking-wider uppercase hover:text-[#7CFC00] transition-colors relative group"
            >
              Shows
              <div className="absolute -bottom-1 left-0 w-0 h-px bg-[#7CFC00] transition-all duration-300 group-hover:w-full" />
            </Link>
            <Link
              to="/artists"
              className="text-sm font-medium tracking-wider uppercase hover:text-[#7CFC00] transition-colors relative group"
            >
              Artists
              <div className="absolute -bottom-1 left-0 w-0 h-px bg-[#7CFC00] transition-all duration-300 group-hover:w-full" />
            </Link>
            <Link
              to={"/venues"}
              className="text-sm font-medium tracking-wider uppercase hover:text-[#7CFC00] transition-colors relative group"
            >
              Venues
              <div className="absolute -bottom-1 left-0 w-0 h-px bg-[#7CFC00] transition-all duration-300 group-hover:w-full" />
            </Link>
            <Link
              to="/merch"
              className="text-sm font-medium tracking-wider uppercase hover:text-[#7CFC00] transition-colors relative group"
            >
              Merch
              <div className="absolute -bottom-1 left-0 w-0 h-px bg-[#7CFC00] transition-all duration-300 group-hover:w-full" />
            </Link>
            <Link
              to={"/donate"}
              className="text-sm font-medium tracking-wider uppercase hover:text-purple-400 text-zinc-300 transition-colors relative group"
            >
              Donate
              <div className="absolute -bottom-1 left-0 w-0 h-px bg-purple-500 transition-all duration-300 group-hover:w-full" />
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
