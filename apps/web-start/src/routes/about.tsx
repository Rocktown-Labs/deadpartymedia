import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

/**
 * Ported from apps/web/src/app/about/page.tsx.
 * next/image -> plain <img>, next/link -> TanStack Link, metadata export ->
 * route head(). The Next.js version's `await connection()` (forced dynamic)
 * has no Start equivalent needed here — the route is server-rendered per
 * request by default.
 */
export const Route = createFileRoute("/about")({
  component: AboutPage,
  head: () => ({
    meta: [
      {
        content:
          "Learn about Dead Party Media and our mission to spotlight Arkansas artists, events, and local music culture.",
        name: "description",
      },
      {
        content:
          "Learn about Dead Party Media and our mission to spotlight Arkansas artists, events, and local music culture.",
        property: "og:description",
      },
      { content: "Dead Party Media", property: "og:site_name" },
      { content: "About | Dead Party Media", property: "og:title" },
      { content: "website", property: "og:type" },
      { content: "https://www.deadpartymedia.com/about", property: "og:url" },
      {
        content: "https://www.deadpartymedia.com/images/dead-party-logo-og.jpg",
        property: "og:image",
      },
      { content: "summary_large_image", name: "twitter:card" },
      { content: "About | Dead Party Media", name: "twitter:title" },
      {
        content: "https://www.deadpartymedia.com/images/dead-party-logo-og.jpg",
        name: "twitter:image",
      },
      { title: "About | Dead Party Media" },
    ],
  }),
});

function AboutPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <main className="pt-40 pb-20">
        <div className="container mx-auto max-w-4xl px-6">
          <Link
            className="mb-8 inline-flex items-center text-[#7CFC00] hover:text-[#7CFC00]/80"
            to="/"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Link>

          <div className="mb-16 text-center">
            <div className="mb-8">
              <img
                alt="Dead Party Media Logo"
                className="mx-auto"
                height={150}
                src="/images/dead-party-logo.png"
                width={150}
              />
            </div>
            <h1 className="mb-8 text-4xl font-black leading-tight md:text-6xl">
              What is Dead Party Media?
            </h1>
            <div className="mx-auto h-1 w-24 bg-[#7CFC00]"></div>
          </div>

          <div className="max-w-none text-lg">
            <p className="mb-8 leading-relaxed text-gray-300">
              We are your premier destination for all things music in Arkansas! Whether you're
              looking for local rappers, country singers, hardcore bands or EDM DJs, we celebrate it
              all. Our mission is to shine an equal spotlight on every artist in the local scene
              ensuring everyone gets a chance to be seen and heard!
            </p>

            <p className="mb-8 leading-relaxed text-gray-300">
              We are a collective of local artists, writers, journalists, musicians, editors and
              creatives. We use our creativity to highlight local music, artists and events. We'll
              keep you up-to-date with the local music buzz so you're never out of the loop when it
              comes to local talent!
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
