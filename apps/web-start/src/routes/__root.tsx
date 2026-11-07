import { createRootRoute, HeadContent, Link, Outlet, Scripts } from "@tanstack/react-router";
import AppClerkProvider from "../integrations/clerk/provider";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
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
  component: RootDocument,
  notFoundComponent: NotFound,
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

function RootDocument() {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="min-h-screen bg-[#0A0A0A] text-white antialiased">
        <AppClerkProvider>
          <Outlet />
        </AppClerkProvider>
        <Scripts />
      </body>
    </html>
  );
}
