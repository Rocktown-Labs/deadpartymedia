import { createFileRoute, Link } from "@tanstack/react-router";
import { Image } from "@unpic/react";
import { ArrowRight, UsersRound } from "lucide-react";
import { PageTitleHeader } from "#/components/page-title-header.tsx";
import { listArtmakers } from "#/lib/artmakers.functions.ts";
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
  loader: async () => {
    const [artworks, artmakers] = await Promise.all([listPublishedArtworks(), listArtmakers()]);
    return { artmakers, artworks };
  },
  validateSearch: (search: Record<string, unknown>) => ({
    medium: typeof search.medium === "string" ? search.medium : undefined,
  }),
});

function ExhibitionsPage() {
  const { artmakers, artworks } = Route.useLoaderData();
  const { medium } = Route.useSearch();
  const activeGroup = medium ? getMediumGroup(medium) : null;
  const filteredArtmakers = activeGroup
    ? artmakers.filter((artmaker) =>
        artmaker.medium.some((item) =>
          activeGroup.mediums.some((candidate) =>
            item.toLowerCase().includes(candidate.toLowerCase()),
          ),
        ),
      )
    : artmakers;
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
          eyebrow="Medium Directory"
          title="EXHIBITIONS"
          description="Browse Arkansas artmakers by medium, then open each profile for their gallery, posts, events, and commission path."
        />

        <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {MEDIUM_GROUPS.map((group) => {
            const Icon = group.icon;
            return (
              <Link
                key={group.slug}
                to="/exhibitions"
                search={{ medium: group.slug }}
                className={`border p-4 text-white no-underline transition-colors ${
                  activeGroup?.slug === group.slug
                    ? "border-[#7CFC00] bg-[#7CFC00]/10"
                    : "border-gray-800 bg-[#111111] hover:border-[#7CFC00]"
                }`}
              >
                <Icon className="size-5 text-[#7CFC00]" />
                <h2 className="mt-3 font-black text-xl">{group.label}</h2>
                <p className="mt-2 text-gray-400 text-sm leading-6">{group.description}</p>
              </Link>
            );
          })}
        </div>

        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-gray-800 bg-[#111111] p-4">
          <div>
            <p className="font-black text-[#7CFC00] text-xs uppercase tracking-[0.22em]">
              {activeGroup ? activeGroup.label : "All mediums"}
            </p>
            <p className="mt-1 text-gray-400 text-sm">
              Showing {filteredArtmakers.length} artmaker
              {filteredArtmakers.length === 1 ? "" : "s"} and {filteredArtworks.length} artwork
              {filteredArtworks.length === 1 ? "" : "s"}.
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

        {filteredArtmakers.length > 0 ? (
          <section className="mb-10">
            <div className="mb-4 flex items-center gap-2">
              <UsersRound className="size-5 text-[#7CFC00]" />
              <h2 className="font-black text-2xl">Artmakers</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredArtmakers.map((artmaker) => (
                <Link
                  key={artmaker.id}
                  to="/artmakers/$slug"
                  params={{ slug: artmaker.slug }}
                  className="group border border-gray-800 bg-[#111111] p-4 text-white no-underline transition-colors hover:border-[#7CFC00]"
                >
                  <div className="flex gap-4">
                    <div className="grid size-20 shrink-0 place-items-center overflow-hidden border border-gray-800 bg-black">
                      {artmaker.image ? (
                        <Image
                          src={artmaker.image}
                          alt={artmaker.name}
                          width={160}
                          height={160}
                          className="size-full object-cover"
                        />
                      ) : (
                        <span className="font-black text-3xl text-[#7CFC00]">
                          {artmaker.name.slice(0, 1).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-black text-xl group-hover:text-[#7CFC00]">
                        {artmaker.name}
                      </h3>
                      <p className="mt-1 text-gray-400 text-sm">
                        {artmaker.city}, {artmaker.state}
                      </p>
                      <p className="mt-3 line-clamp-2 text-gray-500 text-sm">
                        {artmaker.medium.join(", ") || "Visual Art"}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {filteredArtworks.length > 0 ? (
          <section>
            <div className="mb-4">
              <h2 className="font-black text-2xl">Gallery</h2>
              <p className="mt-1 text-gray-500 text-sm">
                Recent public uploads from artmaker profiles.
              </p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {filteredArtworks.map((artwork) => (
                <article
                  key={artwork.id}
                  className="group overflow-hidden rounded-lg border border-gray-800 bg-[#111111] transition-colors hover:border-[#7CFC00]"
                >
                  <div className="grid aspect-square place-items-center overflow-hidden bg-black">
                    <Image
                      src={artwork.image}
                      alt={artwork.title}
                      width={640}
                      height={640}
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
          </section>
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
