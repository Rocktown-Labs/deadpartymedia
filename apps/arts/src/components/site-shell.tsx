import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/tanstack-react-start";
import { Link } from "@tanstack/react-router";
import { LayoutDashboard } from "lucide-react";

const navItems = [
  { label: "Artmakers", to: "/artmakers" },
  { label: "Events", to: "/" },
  { label: "Editorial", to: "/" },
] as const;

export function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#080808] text-white">
      <header className="fixed top-0 right-0 left-0 z-50 border-neutral-800 border-b bg-[#080808]/94 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-5">
          <div className="flex items-center justify-between border-neutral-800/70 border-b py-2 text-[10px] text-neutral-500 uppercase tracking-[0.32em]">
            <span>Dead Party Arts</span>
            <span className="hidden sm:inline">Arkansas Visual Culture</span>
            <span>Est. 2026</span>
          </div>
          <nav className="flex items-center justify-between gap-6 py-5">
            <Link
              to="/"
              className="group flex items-center gap-3 no-underline"
              aria-label="Dead Party Arts home"
            >
              <img
                src="/images/dead-party-arts-logo.jpeg"
                alt="Dead Party Arts"
                className="size-14 border border-[#7CFC00]/60 object-cover shadow-[0_0_28px_rgba(124,252,0,0.18)]"
              />
              <span className="hidden leading-none sm:block">
                <span className="block font-black text-2xl tracking-tighter">
                  <span className="text-[#7CFC00]">DEAD</span>{" "}
                  <span className="text-white">PARTY</span>{" "}
                  <span className="text-fuchsia-400">ARTS</span>
                </span>
                <span className="mt-1 block text-[10px] text-neutral-400 uppercase tracking-[0.34em]">
                  Arkansas artists in full color
                </span>
              </span>
            </Link>

            <div className="hidden items-center gap-8 lg:flex">
              {navItems.map((item) => (
                <Link
                  key={item.label}
                  to={item.to}
                  activeProps={{ className: "text-[#7CFC00]" }}
                  className="group relative font-bold text-neutral-300 text-xs uppercase tracking-[0.24em] no-underline transition-colors hover:text-[#7CFC00]"
                >
                  {item.label}
                  <span className="-bottom-2 absolute left-0 h-px w-0 bg-[#7CFC00] transition-all group-hover:w-full" />
                </Link>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <Show when="signed-in">
                <Link
                  to="/dashboard"
                  className="hidden h-10 items-center gap-2 border border-neutral-800 px-3 font-black text-[10px] text-white uppercase tracking-[0.18em] no-underline transition-colors hover:border-[#7CFC00] md:flex"
                >
                  <LayoutDashboard className="size-4" />
                  Dashboard
                </Link>
                <UserButton />
              </Show>
              <Show when="signed-out">
                <SignInButton>
                  <button
                    type="button"
                    className="h-10 border border-neutral-800 bg-transparent px-3 font-black text-[10px] text-white uppercase tracking-[0.18em] transition-colors hover:border-[#7CFC00]"
                  >
                    Sign In
                  </button>
                </SignInButton>
                <SignUpButton>
                  <button
                    type="button"
                    className="h-10 border border-[#7CFC00] bg-[#7CFC00] px-3 font-black text-[10px] text-black uppercase tracking-[0.18em] transition-colors hover:bg-[#a5ff43]"
                  >
                    Join
                  </button>
                </SignUpButton>
              </Show>
            </div>
          </nav>
        </div>
      </header>

      {children}

      <footer className="border-neutral-800 border-t px-5 py-12">
        <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-[1.2fr_0.8fr_0.8fr]">
          <div>
            <div className="font-black text-2xl tracking-tighter">
              <span className="text-[#7CFC00]">DEAD</span> PARTY{" "}
              <span className="text-fuchsia-400">ARTS</span>
            </div>
            <p className="mt-3 max-w-md text-neutral-400 text-sm leading-6">
              A dedicated home for Arkansas painters, illustrators, tattooers, ceramicists,
              designers, photographers, and beautifully hard to classify makers.
            </p>
          </div>
          <div>
            <h2 className="font-black text-neutral-500 text-xs uppercase tracking-[0.28em]">
              Explore
            </h2>
            <div className="mt-4 grid gap-2">
              <Link to="/artmakers" className="text-neutral-300 no-underline hover:text-[#7CFC00]">
                Artmakers
              </Link>
              <Link to="/onboarding" className="text-neutral-300 no-underline hover:text-[#7CFC00]">
                Join as an artist
              </Link>
            </div>
          </div>
          <div>
            <h2 className="font-black text-neutral-500 text-xs uppercase tracking-[0.28em]">
              Studio
            </h2>
            <p className="mt-4 text-neutral-400 text-sm leading-6">
              Built for Arkansas first, with uploads, commissions, and connected payments queued up
              behind the profile foundation.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
