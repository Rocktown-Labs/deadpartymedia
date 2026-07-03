import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/tanstack-react-start";
import { Link, useLocation } from "@tanstack/react-router";
import { LayoutDashboard, Palette } from "lucide-react";

const navItems = [
  { label: "Artmakers", to: "/artmakers" },
  { label: "Events", to: "/events" },
  { label: "Articles", to: "/articles" },
] as const;

const currentDate = new Date();
const issueDate = currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

export function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = useLocation({ select: (location) => location.pathname });
  const shouldShowFooter = !(pathname.startsWith("/admin") || pathname.startsWith("/dashboard"));

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <header className="fixed top-0 z-50 w-full border-gray-800 border-b bg-[#0A0A0A]/95 backdrop-blur-xl">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between border-gray-800/50 border-b py-2 text-gray-500 text-xs tracking-widest">
            <span>
              ISSUE {currentDate.getMonth() + 1}.{currentDate.getFullYear()}
            </span>
            <span className="hidden md:block">{issueDate.toUpperCase()}</span>
            <span className="hidden md:block">ARKANSAS ARTS</span>
          </div>

          <nav className="flex items-center justify-between gap-6 py-6">
            <div className="flex-1">
              <Link to="/" className="block no-underline" aria-label="Dead Party Arts home">
                <img
                  src="/images/dead-party-arts-logo.jpeg"
                  alt="Dead Party Arts"
                  className="size-14 object-cover lg:hidden"
                />
                <div className="hidden lg:block">
                  <div className="font-black text-3xl tracking-tighter">
                    <span className="text-[#7CFC00]">DEAD</span>
                    <span className="text-white"> PARTY</span>
                    <span className="text-fuchsia-500"> ARTS</span>
                  </div>
                  <div className="mt-1 font-light text-[10px] text-neutral-300 tracking-[0.4em]">
                    YOUR #1 OUTLET FOR ARKANSAS ART
                  </div>
                </div>
              </Link>
            </div>

            <div className="hidden flex-1 items-center justify-center gap-8 lg:flex">
              {navItems.map((item) => (
                <Link
                  key={item.label}
                  to={item.to}
                  activeProps={{ className: "text-[#7CFC00]" }}
                  className="group relative font-medium text-sm uppercase tracking-wider text-white no-underline transition-colors hover:text-[#7CFC00]"
                >
                  {item.label}
                  <span className="-bottom-1 absolute left-0 h-px w-0 bg-[#7CFC00] transition-all duration-300 group-hover:w-full" />
                </Link>
              ))}
            </div>

            <div className="flex flex-1 items-center justify-end gap-2 lg:gap-3">
              <Link
                to="/artmakers"
                aria-label="Browse artmakers"
                className="hidden size-11 items-center justify-center rounded-lg border border-gray-800 bg-transparent text-white no-underline transition-colors hover:border-[#7CFC00] hover:text-[#7CFC00] sm:flex"
              >
                <Palette className="size-4" />
              </Link>
              <Show when="signed-in">
                <Link
                  to="/dashboard"
                  className="flex h-11 items-center justify-center rounded-lg border border-gray-800 bg-transparent px-3 text-white no-underline transition-colors hover:border-[#7CFC00]"
                >
                  <LayoutDashboard className="size-4" />
                  <span className="ml-2 hidden font-bold text-xs uppercase tracking-wider md:inline">
                    Dashboard
                  </span>
                </Link>
                <UserButton
                  appearance={{
                    elements: {
                      avatarBox:
                        "h-11 w-11 border border-gray-800 hover:border-[#7CFC00] rounded-lg",
                      userButtonPopoverActionButton: "text-white hover:bg-gray-900",
                      userButtonPopoverActionButtonText: "text-white",
                      userButtonPopoverCard: "bg-[#0A0A0A] border-gray-800",
                    },
                  }}
                />
              </Show>
              <Show when="signed-out">
                <SignInButton>
                  <button
                    type="button"
                    className="flex h-11 cursor-pointer items-center justify-center rounded-lg border border-gray-800 bg-transparent px-3 text-white transition-colors hover:border-[#7CFC00]"
                    aria-label="Sign in"
                  >
                    <span className="font-bold text-xs uppercase tracking-wider">Sign In</span>
                  </button>
                </SignInButton>
                <SignUpButton>
                  <button
                    type="button"
                    className="flex h-11 cursor-pointer items-center justify-center rounded-lg border border-[#7CFC00] bg-[#7CFC00] px-3 text-black transition-colors hover:bg-[#a5ff43]"
                    aria-label="Get started"
                  >
                    <span className="font-bold text-xs uppercase tracking-wider">Get Started</span>
                  </button>
                </SignUpButton>
              </Show>
            </div>
          </nav>
        </div>
      </header>

      {children}

      {shouldShowFooter ? (
        <>
          <section className="border-gray-800 border-t px-6 py-20">
            <div className="container mx-auto">
              <div className="mb-12 text-center">
                <div className="mb-4 font-bold text-gray-500 text-sm uppercase tracking-[0.4em]">
                  Stay Connected
                </div>
                <h2 className="font-black text-4xl tracking-tight">Follow The Wall</h2>
              </div>
              <div className="mx-auto grid max-w-3xl gap-4 sm:grid-cols-3">
                {navItems.map((item) => (
                  <Link
                    key={item.label}
                    to={item.to}
                    className="rounded-lg border border-gray-800 px-5 py-4 text-center font-black text-white text-xs uppercase tracking-[0.2em] no-underline transition-colors hover:border-[#7CFC00] hover:text-[#7CFC00]"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          </section>

          <footer className="border-gray-800 border-t px-6 py-12">
            <div className="container mx-auto">
              <div className="mb-12 grid gap-12 md:grid-cols-3">
                <div>
                  <div className="font-black text-2xl tracking-tighter">
                    <span className="text-[#7CFC00]">DEAD</span>{" "}
                    <span className="text-white">PARTY</span>{" "}
                    <span className="text-fuchsia-500">ARTS</span>
                  </div>

                  <p className="mt-3 max-w-md text-gray-400 text-sm leading-relaxed">
                    Documenting Arkansas visual artists, studios, pop-ups, and all the beautiful
                    work that refuses to fit one category.
                  </p>
                </div>
                <div>
                  <h3 className="mb-4 font-bold text-gray-500 text-xs uppercase tracking-[0.3em]">
                    Editorial
                  </h3>
                  <div className="space-y-2">
                    <Link
                      to="/articles"
                      className="block text-gray-400 text-sm no-underline transition-colors hover:text-[#7CFC00]"
                    >
                      Articles
                    </Link>
                    <Link
                      to="/events"
                      className="block text-gray-400 text-sm no-underline transition-colors hover:text-[#7CFC00]"
                    >
                      Events
                    </Link>
                    <Link
                      to="/onboarding"
                      className="block text-gray-400 text-sm no-underline transition-colors hover:text-[#7CFC00]"
                    >
                      Join as an artist
                    </Link>
                  </div>
                </div>
                <div>
                  <h3 className="mb-4 font-bold text-gray-500 text-xs uppercase tracking-[0.3em]">
                    Studio
                  </h3>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    Built for Arkansas first, with artwork uploads, commissions, and connected
                    payments queued up behind the profile foundation.
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-center justify-between border-gray-800 border-t pt-8 text-gray-500 text-xs md:flex-row">
                <span>© {new Date().getFullYear()} Dead Party Arts. All rights reserved.</span>
                <span className="uppercase tracking-wider">Little Rock, Arkansas</span>
              </div>
            </div>
          </footer>
        </>
      ) : null}
    </div>
  );
}
