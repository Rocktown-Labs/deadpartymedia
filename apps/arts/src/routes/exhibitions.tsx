import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { PageTitleHeader } from "#/components/page-title-header.tsx";
import { listPublishedArtworks } from "#/lib/artworks.functions.ts";
import { MEDIUM_GROUPS, getMediumGroup } from "#/lib/mediums.ts";
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
  validateSearch: (search: Record<string, unknown>) => ({
    medium: typeof search.medium === "string" ? search.medium : undefined,
  }),
});

function ExhibitionsPage() {
  const artworks = Route.useLoaderData();
  const { medium } = Route.useSearch();
  const activeGroup = medium ? getMediumGroup(medium) : null;
  const filteredArtworks = activeGroup
    ? artworks.filter((artwork) =>
        activeGroup.mediums.some((candidate) =>
          (artwork.medium ?? "").toLowerCase().includes(candidate.toLowerCase()),
        ),
      )
    : artworks;

  return (
    <main className="px-6 pt-[calc(var(--navbar-offset)+2rem)] pb-20">
      <div className="container mx-auto">
        <PageTitleHeader
          eyebrow="Artwork Wall"
          title="EXHIBITIONS"
          description="A rolling gallery of Arkansas visual work from artmakers on the Dead Party Arts wall."
        />

        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-gray-800 bg-[#111111] p-4">
          <div>
            <p className="font-black text-[#7CFC00] text-xs uppercase tracking-[0.22em]">
              Medium filter
            </p>
            <p className="mt-1 text-gray-400 text-sm">
              {activeGroup ? activeGroup.description : "Showing every published artwork."}
            </p>
          </div>
          <select
            value={medium ?? "all"}
            onChange={(event) => {
              const value = event.target.value;
              window.location.href =
                value === "all" ? "/exhibitions" : `/exhibitions?medium=${value}`;
            }}
            className="h-11 rounded-lg border border-gray-800 bg-[#0A0A0A] px-4 font-bold text-white text-sm"
          >
            <option value="all">All mediums</option>
            {MEDIUM_GROUPS.map((group) => (
              <option key={group.slug} value={group.slug}>
                {group.label}
              </option>
            ))}
          </select>
        </div>

        {filteredArtworks.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {filteredArtworks.map((artwork) => (
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
              {activeGroup
                ? `No ${activeGroup.label.toLowerCase()} artworks are published yet.`
                : "The exhibition wall is ready. Artist uploads will appear here first."}
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
