import { createRootRouteWithContext, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";
import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";
import "@/app/globals.css";
import { CartProvider } from "@/components/cart/cart-context";
import Providers from "@/components/providers";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import MobileBottomNav from "@/components/mobile-bottom-nav";

interface MyRouterContext {
  queryClient: QueryClient;
}

const SITE_URL = "https://www.deadpartymedia.com";
const DEFAULT_OG_IMAGE = `${SITE_URL}/images/dead-party-logo-og.jpg`;

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => ({
    links: [
      { rel: "preconnect", href: "https://clerk.deadpartymedia.com" },
      { rel: "preconnect", href: "https://img.clerk.com" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png", sizes: "180x180" },
      { rel: "icon", href: "/favicon.ico" },
      { rel: "manifest", href: "/site.webmanifest" },
    ],
    meta: [
      { charSet: "utf-8" },
      { content: "width=device-width, initial-scale=1", name: "viewport" },
      {
        content:
          "Your #1 digital outlet for Arkansas music and live events. We cover artists across all genres, host events, and deliver exclusive content and interviews.",
        name: "description",
      },
      { content: DEFAULT_OG_IMAGE, property: "og:image" },
      { content: "Dead Party Media", property: "og:site_name" },
      { content: "website", property: "og:type" },
      { content: SITE_URL, property: "og:url" },
      { content: "summary_large_image", name: "twitter:card" },
      { title: "Dead Party Media - Your #1 Outlet for Arkansas Music & Events" },
    ],
  }),
  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body className="antialiased">
        <Providers>
          <CartProvider>
            <Navbar />
            <main id="main" className="pb-16 lg:pb-0">
              {children}
            </main>
            <div className="pb-16 lg:pb-0">
              <Footer />
            </div>
            <MobileBottomNav />
          </CartProvider>
        </Providers>
        <Scripts />
      </body>
    </html>
  );
}
