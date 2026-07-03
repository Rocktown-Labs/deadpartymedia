import { Show, SignInButton, SignUpButton, UserButton, useUser } from "@clerk/tanstack-react-start";
import { Link, useLocation } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Image } from "@unpic/react";
import { ExternalLink, Instagram, LayoutDashboard, ShoppingBag, Youtube } from "lucide-react";
import { useEffect, useState } from "react";
import { type ArtsCart, getArtsCart, updateArtsCartItem } from "#/lib/fourthwall.functions.ts";

const navItems = [
  { label: "Artmakers", to: "/artmakers" },
  { label: "Exhibitions", to: "/exhibitions" },
  { label: "Events", to: "/events" },
  { label: "Articles", to: "/articles" },
  { label: "Merch", to: "/merch" },
] as const;

const socialLinks = [
  { href: "https://www.instagram.com/deadpartyy", icon: Instagram, label: "Instagram" },
  { href: "https://www.youtube.com/@DeadPartyMedia", icon: Youtube, label: "YouTube" },
  { href: "https://linktr.ee/deadpartyy", icon: ExternalLink, label: "All Links" },
] as const;

const currentDate = new Date();
const issueDate = currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
const CART_STORAGE_KEY = "dead-party-arts-cart-id";

function isArtsStaffRole(role: unknown) {
  return (
    role === "admin" || role === "arts_admin" || role === "arts_writer" || role === "super_admin"
  );
}

export function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = useLocation({ select: (location) => location.pathname });
  const shouldShowFooter = !(pathname.startsWith("/admin") || pathname.startsWith("/dashboard"));
  const { user } = useUser();
  const role = user?.publicMetadata.role;
  const dashboardRoute = isArtsStaffRole(role) ? "/admin" : "/dashboard";
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cart, setCart] = useState<ArtsCart | null>(null);
  const [cartError, setCartError] = useState("");
  const [isCartLoading, setIsCartLoading] = useState(false);
  const loadCart = useServerFn(getArtsCart);
  const updateCart = useServerFn(updateArtsCartItem);

  const refreshCart = async () => {
    const cartId = window.localStorage.getItem(CART_STORAGE_KEY) ?? undefined;
    if (!cartId) {
      setCart(null);
      return;
    }

    setIsCartLoading(true);
    setCartError("");
    try {
      setCart(await loadCart({ data: { cartId } }));
    } catch (error) {
      setCartError(error instanceof Error ? error.message : "Could not load the cart.");
    } finally {
      setIsCartLoading(false);
    }
  };

  useEffect(() => {
    if (isCartOpen) {
      void refreshCart();
    }
  }, [isCartOpen]);

  useEffect(() => {
    if (!isCartOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsCartOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isCartOpen]);

  useEffect(() => {
    const onCartUpdated = () => {
      void refreshCart();
      setIsCartOpen(true);
    };

    window.addEventListener("arts-cart-updated", onCartUpdated);
    return () => window.removeEventListener("arts-cart-updated", onCartUpdated);
  }, []);

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
                <Image
                  src="/images/deadpartyarts-trans.png"
                  alt="Dead Party Arts"
                  width={56}
                  height={56}
                  className="size-14 object-contain lg:hidden"
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
                to="/merch"
                aria-label="Open cart"
                className="hidden size-11 items-center justify-center rounded-lg border border-gray-800 bg-transparent text-white no-underline transition-colors hover:border-[#7CFC00] hover:text-[#7CFC00] sm:flex"
                onClick={(event) => {
                  event.preventDefault();
                  setIsCartOpen(true);
                }}
              >
                <ShoppingBag className="size-4" />
              </Link>
              <Show when="signed-in">
                <Link
                  to={dashboardRoute}
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

      {isCartOpen ? (
        <div
          className="fixed inset-0 z-[80] bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setIsCartOpen(false)}
          role="presentation"
        >
          <div className="ml-auto flex min-h-full max-w-md items-center">
            <div
              className="w-full rounded-lg border border-gray-800 bg-[#0A0A0A] p-6 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-black text-[#7CFC00] text-xs uppercase tracking-[0.28em]">
                    Cart
                  </p>
                  <h2 className="mt-2 font-black text-3xl tracking-tight">Cart</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCartOpen(false)}
                  className="rounded-md border border-gray-800 px-3 py-2 text-gray-400 text-sm hover:border-[#7CFC00] hover:text-[#7CFC00]"
                >
                  Close
                </button>
              </div>
              {isCartLoading ? (
                <p className="mt-5 text-gray-400 leading-7">Loading the Fourthwall cart...</p>
              ) : cartError ? (
                <p className="mt-5 text-red-300 leading-7">{cartError}</p>
              ) : cart?.lines.length ? (
                <>
                  <div className="mt-6 grid gap-4">
                    {cart.lines.map((line) => (
                      <div
                        key={line.id}
                        className="grid grid-cols-[64px_1fr] gap-4 border-gray-800 border-b pb-4 last:border-b-0"
                      >
                        <div className="aspect-square overflow-hidden rounded-md bg-black">
                          {line.image ? (
                            <Image
                              src={line.image}
                              alt={line.productTitle}
                              width={64}
                              height={64}
                              className="h-full w-full object-cover"
                            />
                          ) : null}
                        </div>
                        <div>
                          <h3 className="font-black text-sm">{line.productTitle}</h3>
                          <p className="mt-1 text-gray-500 text-xs">{line.variantTitle}</p>
                          <div className="mt-3 flex items-center justify-between gap-3">
                            <div className="flex items-center rounded-md border border-gray-800">
                              <button
                                type="button"
                                className="px-3 py-2 text-gray-400 hover:text-[#7CFC00]"
                                onClick={async () => {
                                  const updated = await updateCart({
                                    data: {
                                      cartId: cart.id,
                                      merchandiseId: line.merchandiseId,
                                      quantity: Math.max(0, line.quantity - 1),
                                    },
                                  });
                                  setCart(updated);
                                }}
                              >
                                -
                              </button>
                              <span className="min-w-8 text-center font-bold text-sm">
                                {line.quantity}
                              </span>
                              <button
                                type="button"
                                className="px-3 py-2 text-gray-400 hover:text-[#7CFC00]"
                                onClick={async () => {
                                  const updated = await updateCart({
                                    data: {
                                      cartId: cart.id,
                                      merchandiseId: line.merchandiseId,
                                      quantity: line.quantity + 1,
                                    },
                                  });
                                  setCart(updated);
                                }}
                              >
                                +
                              </button>
                            </div>
                            <p className="font-black text-sm">
                              ${line.total} {line.currency}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 flex items-center justify-between border-gray-800 border-t pt-5">
                    <span className="font-black text-sm uppercase tracking-[0.18em]">Subtotal</span>
                    <span className="font-black text-xl">
                      ${cart.subtotal} {cart.currency}
                    </span>
                  </div>
                  {cart.checkoutUrl ? (
                    <a
                      href={cart.checkoutUrl}
                      className="mt-6 inline-flex w-full justify-center rounded-lg border border-[#7CFC00] bg-[#7CFC00] px-4 py-3 font-black text-black text-xs uppercase tracking-[0.18em] no-underline"
                    >
                      Checkout
                    </a>
                  ) : (
                    <p className="mt-5 text-gray-500 text-sm">
                      Checkout URL is not configured yet. Add the Fourthwall checkout environment
                      variable to enable checkout.
                    </p>
                  )}
                </>
              ) : (
                <>
                  <p className="mt-5 text-gray-400 leading-7">
                    Your cart is empty. The merch wall will show the dedicated arts collection when
                    it is available in Fourthwall.
                  </p>
                  <Link
                    to="/merch"
                    onClick={() => setIsCartOpen(false)}
                    className="mt-6 inline-flex rounded-lg border border-[#7CFC00] bg-[#7CFC00] px-4 py-3 font-black text-black text-xs uppercase tracking-[0.18em] no-underline"
                  >
                    View merch wall
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {shouldShowFooter ? (
        <>
          <section className="border-gray-800 border-t px-6 py-20">
            <div className="container mx-auto">
              <div className="mb-12 text-center">
                <div className="mb-4 font-bold text-gray-500 text-sm uppercase tracking-[0.4em]">
                  Stay Connected
                </div>
                <h2 className="font-black text-4xl tracking-tight">Follow The Scene</h2>
              </div>
              <div className="mx-auto grid max-w-3xl grid-cols-3 justify-items-center gap-6">
                {socialLinks.map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noreferrer"
                    className="group text-center no-underline transition-transform duration-300 hover:scale-105"
                    aria-label={social.label}
                  >
                    <div className="mx-auto mb-3 flex size-16 items-center justify-center rounded-full border-2 border-gray-800 transition-colors group-hover:border-[#7CFC00]">
                      <social.icon className="size-7 text-gray-400 transition-colors group-hover:text-[#7CFC00]" />
                    </div>
                    <span className="font-medium text-gray-500 text-xs uppercase tracking-wider transition-colors group-hover:text-[#7CFC00]">
                      {social.label}
                    </span>
                  </a>
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
