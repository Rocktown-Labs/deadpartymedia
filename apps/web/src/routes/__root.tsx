import ErrorPage from "@/app/error";
import css from "@/app/globals.css?url";
import NotFound from "@/app/not-found";
import { CartProvider } from "@/components/cart/cart-context";
import CartModal from "@/components/cart/cart-modal";
import Footer from "@/components/footer";
import MobileBottomNav from "@/components/mobile-bottom-nav";
import Navbar from "@/components/navbar";
import Providers from "@/components/providers";
import { getMusicApi } from "@/lib/api.server";
import { loadAuthProviders, loadMusicSession } from "@/lib/session.functions";
import { readResponse } from "@dpmedia/api-client";
import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";
import type { QueryClient } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  HeadContent,
  Scripts,
  useLocation,
} from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
const loadCart = createServerFn({ method: "GET" }).handler(async () =>
  readResponse(await getMusicApi().commerce.cart.$get()),
);
export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  beforeLoad: async () => ({ session: await loadMusicSession() }),
  loader: async () => {
    const [cart, authProviders] = await Promise.all([loadCart(), loadAuthProviders()]);
    return { cart, authProviders, renderedAt: Date.now() };
  },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "Dead Party Media - Your #1 Outlet for Arkansas Music & Events" },
      {
        name: "description",
        content:
          "Your #1 digital outlet for Arkansas music and live events. We cover artists across all genres, host events, and deliver exclusive content and interviews.",
      },
      { name: "theme-color", content: "#0A0A0A" },
    ],
    links: [
      { rel: "stylesheet", href: css },
      { rel: "icon", href: "/favicon.ico" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "manifest", href: "/site.webmanifest" },
    ],
  }),
  notFoundComponent: NotFound,
  errorComponent: ({ error, reset }) => (
    <ErrorPage
      error={error instanceof Error ? error : new Error("Unable to load page")}
      reset={reset}
    />
  ),
  shellComponent: RootDocument,
});
function RootDocument({ children }: { children: React.ReactNode }) {
  const data = Route.useLoaderData();
  const authPage = useLocation({ select: (location) => location.pathname.startsWith("/auth/") });
  useEffect(() => {
    if (import.meta.env.PROD) void import("@/instrumentation-client");
  }, []);
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
        <script
          dangerouslySetInnerHTML={{
            __html:
              "window.traks=window.traks||function(){(window.traks.q=window.traks.q||[]).push(arguments)}",
          }}
        />
        <script
          defer
          data-site="pb_live_vwr48ih1popzlhsns275oho0"
          src="https://traks-collect.rocktown-labs.workers.dev/t.js"
        />
      </head>
      <body className="antialiased">
        <Providers authProviders={data?.authProviders}>
          <CartProvider initialCart={data?.cart ?? undefined}>
            {!authPage && <Navbar issuedAt={data?.renderedAt} />}
            {!authPage && <CartModal />}
            <main id="main" className="pb-16 lg:pb-0">
              {children}
            </main>
            {!authPage && (
              <>
                <div className="pb-16 lg:pb-0">
                  <Footer />
                </div>
                <MobileBottomNav />
              </>
            )}
          </CartProvider>
        </Providers>
        <Scripts />
      </body>
    </html>
  );
}
