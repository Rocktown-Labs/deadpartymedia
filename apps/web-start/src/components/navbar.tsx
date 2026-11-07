import { SignInButton, SignUpButton, useUser, UserButton } from "@clerk/tanstack-react-start";
import { Link, useLocation } from "@tanstack/react-router";
import { Menu, Music2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const NAV_LINKS = [
  { label: "Artists", to: "/artists" },
  { label: "Articles", to: "/articles" },
  { label: "Events", to: "/events" },
  { label: "Music", to: "/music" },
  { label: "Merch", to: "/merch" },
  { label: "Venues", to: "/venues" },
  { label: "About", to: "/about" },
] as const;

/**
 * Ported from apps/web/src/components/navbar.tsx — same links, dark chrome,
 * Clerk auth area, and mobile Sheet. Path helpers (route -> dashboard) use
 * the web app's role mapping.
 */
function dashboardFor(role: string | undefined): string {
  if (role === "super_admin" || role === "writer") {
    return "/admin";
  }
  if (role === "artist") {
    return "/artist-dashboard";
  }
  if (role === "venue") {
    return "/venue-dashboard";
  }
  return "/dashboard";
}

export function Navbar() {
  const { isSignedIn, user } = useUser();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const role = (user?.publicMetadata as { role?: string } | undefined)?.role;
  const isActive = (to: string) => location.pathname === to;

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#0A0A0A]/95 backdrop-blur supports-[backdrop-filter]:bg-[#0A0A0A]/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link className="flex items-center gap-2" to="/">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#7CFC00]/15">
            <Music2 className="h-5 w-5 text-[#7CFC00]" />
          </span>
          <span className="font-black tracking-tight text-white">DEAD PARTY</span>
          <span className="font-black tracking-tight text-[#7CFC00]">MEDIA</span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((item) => (
            <Link
              className={
                isActive(item.to)
                  ? "rounded-md px-3 py-2 text-sm font-medium text-[#7CFC00]"
                  : "rounded-md px-3 py-2 text-sm font-medium text-gray-300 hover:text-white"
              }
              key={item.to}
              to={item.to}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 lg:flex">
            {isSignedIn ? (
              <>
                <Link to={dashboardFor(role)}>
                  <Button
                    className="border-[#7CFC00]/40 text-[#7CFC00] hover:bg-[#7CFC00]/10"
                    size="sm"
                    variant="outline"
                  >
                    Dashboard
                  </Button>
                </Link>
                <UserButton />
              </>
            ) : (
              <>
                <SignInButton mode="modal">
                  <Button size="sm" variant="ghost">
                    Sign in
                  </Button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <Button size="sm">Sign up</Button>
                </SignUpButton>
              </>
            )}
          </div>

          <Sheet onOpenChange={setOpen} open={open}>
            <SheetTrigger
              aria-label="Open menu"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-gray-300 hover:text-white lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </SheetTrigger>
            <SheetContent className="border-white/10 bg-[#0A0A0A] lg:hidden" side="right">
              <SheetHeader>
                <SheetTitle className="text-white">
                  DEAD PARTY <span className="text-[#7CFC00]">MEDIA</span>
                </SheetTitle>
              </SheetHeader>
              <nav className="mt-4 flex flex-col gap-1 px-4">
                {NAV_LINKS.map((item) => (
                  <Link
                    className="rounded-md px-3 py-2.5 text-sm font-medium text-gray-200 hover:bg-white/5 hover:text-[#7CFC00]"
                    key={item.to}
                    onClick={() => {
                      setOpen(false);
                    }}
                    to={item.to}
                  >
                    {item.label}
                  </Link>
                ))}
                {isSignedIn ? (
                  <Link
                    className="mt-2 rounded-md bg-[#7CFC00]/10 px-3 py-2.5 text-sm font-semibold text-[#7CFC00]"
                    onClick={() => {
                      setOpen(false);
                    }}
                    to={dashboardFor(role)}
                  >
                    Dashboard
                  </Link>
                ) : null}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
