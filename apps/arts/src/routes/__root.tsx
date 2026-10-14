import { HeadContent, Scripts, createRootRouteWithContext } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { useEffect } from "react";
import { Toaster } from "sonner";

import ClerkProvider from "../integrations/clerk/provider";
import { SiteShell } from "../components/site-shell";

import TanStackQueryDevtools from "../integrations/tanstack-query/devtools";

import appCss from "../styles.css?url";

import type { QueryClient } from "@tanstack/react-query";

interface MyRouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => ({
    meta: [
      {
        charSet: "utf8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, viewport-fit=cover",
      },
      {
        name: "theme-color",
        content: "#0A0A0A",
      },
      {
        title: "Dead Party Arts",
      },
      {
        name: "description",
        content: "Dead Party Arts spotlights Arkansas visual artists, makers, and creative events.",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      {
        rel: "preconnect",
        href: "https://clerk.deadpartymedia.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "icon",
        type: "image/png",
        href: "/deadpartyarts-trans.png",
      },
      {
        rel: "apple-touch-icon",
        href: "/deadpartyarts-trans.png",
      },
      {
        rel: "manifest",
        href: "/manifest.json",
      },
    ],
  }),
  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const reloadOnStaleChunk = () => {
      try {
        const lastReload = Number(sessionStorage.getItem("arts_chunk_reload") || 0);
        const now = Date.now();
        // Limit auto-reload to once per 10 seconds to prevent refresh loops if offline
        if (now - lastReload > 10000) {
          sessionStorage.setItem("arts_chunk_reload", String(now));
          window.location.reload();
        }
      } catch {
        // Fall back gracefully if storage is restricted
      }
    };

    const handlePreloadError = () => {
      reloadOnStaleChunk();
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const msg = event?.reason?.message || String(event?.reason || "");
      if (
        msg.includes("Importing a module script failed") ||
        msg.includes("Failed to fetch dynamically imported module")
      ) {
        reloadOnStaleChunk();
      }
    };

    window.addEventListener("vite:preloadError", handlePreloadError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    return () => {
      window.removeEventListener("vite:preloadError", handlePreloadError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        <ClerkProvider>
          <SiteShell>{children}</SiteShell>
          <Toaster position="bottom-right" theme="dark" />
          <TanStackDevtools
            config={{
              position: "bottom-right",
            }}
            plugins={[
              {
                name: "Tanstack Router",
                render: <TanStackRouterDevtoolsPanel />,
              },
              TanStackQueryDevtools,
            ]}
          />
        </ClerkProvider>
        <Scripts />
      </body>
    </html>
  );
}
