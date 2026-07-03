import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { PageTitleHeader } from "#/components/page-title-header.tsx";
import { listPublishedArtworks } from "#/lib/artworks.functions.ts";
import { createSeoMeta } from "#/lib/seo.ts";

export const Route = createFileRoute("/exhibitions")({
  component: ExhibitionsPage,
  head: () =>
    createSeoMeta({
      description:
        "Explore Arkansas artwork uploaded by Dead Party Arts artmakers, from painting and digital work to ceramics, clothing, photography, and mixed practice.",
      path: "/exhibitions",
      title: "Exhibitions",
    }),
  loader: () => listPublishedArtworks(),
});

function ExhibitionsPage() {
  const artworks = Route.useLoaderData();

  return (
    <main className="px-6 pt-[calc(var(--navbar-offset)+2rem)] pb-20">
      <div className="container mx-auto">
        <PageTitleHeader
          eyebrow="Artwork Wall"
          title="EXHIBITIONS"
          description="A rolling gallery of Arkansas visual work from artmakers on the Dead Party Arts wall."
        />

        {artworks.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {artworks.map((artwork) => (
              <article
                key={artwork.id}
                className="group overflow-hidden rounded-lg border border-gray-800 bg-[#111111] transition-colors hover:border-[#7CFC00]"
              >
                <div className="grid aspect-square place-items-center overflow-hidden bg-black">
                  <img
                    src={artwork.image}
                    alt={artwork.title}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="p-5">
                  <p className="text-[#7CFC00] text-xs uppercase tracking-[0.22em]">
                    {artwork.medium ?? "Mixed practice"}
                  </p>
                  <h2 className="mt-2 font-black text-2xl tracking-tight">{artwork.title}</h2>
                  <p className="mt-2 text-gray-400 text-sm">
                    by{" "}
                    <Link
                      to="/artmakers/$slug"
                      params={{ slug: artwork.artmakerSlug }}
                      className="text-white no-underline hover:text-[#7CFC00]"
                    >
                      {artwork.artmakerName}
                    </Link>{" "}
                    in {artwork.city}, {artwork.state}
                  </p>
                  {artwork.description ? (
                    <p className="mt-4 line-clamp-3 text-gray-400 leading-6">
                      {artwork.description}
                    </p>
                  ) : null}
                  <span className="mt-5 inline-flex items-center gap-2 font-black text-[#7CFC00] text-xs uppercase tracking-[0.2em]">
                    View artist
                    <ArrowRight className="size-4" />
                  </span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-gray-800 bg-[#111111] px-6 py-12 text-center">
            <p className="text-gray-400 text-lg">
              The exhibition wall is ready. Artist uploads will appear here first.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
