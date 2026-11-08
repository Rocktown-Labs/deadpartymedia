import { createRootRouteWithContext, HeadContent, Link, Scripts } from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { Footer } from "../components/footer";
import { Navbar } from "../components/navbar";
import AppClerkProvider from "../integrations/clerk/provider";
import appCss from "../styles.css?url";

interface MyRouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => ({
    links: [{ href: appCss, rel: "stylesheet" }],
    meta: [
      { charSet: "utf-8" },
      { content: "width=device-width, initial-scale=1", name: "viewport" },
      {
        content: "Dead Party Media spotlights Arkansas artists, events, and local music culture.",
        name: "description",
      },
      { title: "Dead Party Media" },
    ],
  }),
  notFoundComponent: NotFound,
  shellComponent: RootDocument,
});

function NotFound() {
  return (
    <main className="mx-auto max-w-4xl px-6 pt-40 pb-20 text-center">
      <p className="mb-2 font-mono text-sm text-[#7CFC00]">404</p>
      <h1 className="mb-6 text-4xl font-black">Page not found</h1>
      <Link className="text-[#7CFC00] underline" to="/">
        Back to home
      </Link>
    </main>
  );
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html className="dark" lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="min-h-screen bg-[#0A0A0A] text-white antialiased">
        <AppClerkProvider>
          <QueryClientProvider client={Route.useRouteContext().queryClient}>
            <Navbar />
            <div className="pt-16">{children}</div>
            <Footer />
          </QueryClientProvider>
        </AppClerkProvider>
        <Scripts />
      </body>
    </html>
  );
}
