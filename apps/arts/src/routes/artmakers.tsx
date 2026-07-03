import { createFileRoute, Link } from "@tanstack/react-router";
import { Instagram, MapPin, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { PageTitleHeader } from "#/components/page-title-header.tsx";
import { Input } from "#/components/ui/input.tsx";
import { listArtmakers } from "#/lib/artmakers.functions.ts";
import { createSeoMeta } from "#/lib/seo.ts";

export const Route = createFileRoute("/artmakers")({
  component: Artmakers,
  head: () =>
    createSeoMeta({
      description:
        "Search Arkansas artmakers by name, city, Instagram, or medium on Dead Party Arts.",
      path: "/artmakers",
      title: "Artmakers",
    }),
  loader: () => listArtmakers(),
});

function Artmakers() {
  const artmakers = Route.useLoaderData();
  const [query, setQuery] = useState("");

  const filteredArtmakers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return artmakers;
    }

    return artmakers.filter((artmaker) => {
      const haystack = [
        artmaker.name,
        artmaker.city,
        artmaker.state,
        artmaker.instagramUsername,
        ...artmaker.medium,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [artmakers, query]);

  return (
    <main className="px-6 pt-[calc(var(--navbar-offset)+2rem)] pb-20">
      <div className="container mx-auto">
        <div className="mb-8 grid gap-6 lg:grid-cols-[1fr_420px] lg:items-end">
          <div>
            <PageTitleHeader
              eyebrow="Directory"
              title="ARTMAKERS"
              description="Search the first wave of Arkansas visual artists by name, city, Instagram, or medium."
            />
          </div>
          <div className="relative">
            <Search className="-translate-y-1/2 absolute top-1/2 left-3 size-4 text-neutral-500" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-12 rounded-lg border-gray-800 bg-[#101010] pl-10 text-white"
              placeholder="Search artists, cities, mediums..."
            />
          </div>
        </div>

        {filteredArtmakers.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredArtmakers.map((artmaker) => (
              <Link
                key={artmaker.id}
                to="/artmakers/$slug"
                params={{ slug: artmaker.slug }}
                className="group rounded-xl border border-gray-800 bg-[#101010] p-5 no-underline transition-colors hover:border-[#7CFC00]"
              >
                <div className="flex min-h-40 flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-4">
                      <h2 className="font-black text-2xl text-white tracking-tight group-hover:text-[#7CFC00]">
                        {artmaker.name}
                      </h2>
                      <Instagram className="size-5 text-neutral-500" />
                    </div>
                    <p className="mt-3 flex items-center gap-2 text-neutral-400 text-sm">
                      <MapPin className="size-4" />
                      {artmaker.city}, {artmaker.state}
                    </p>
                    {artmaker.showPronouns && artmaker.pronouns ? (
                      <p className="mt-2 text-neutral-500 text-sm">{artmaker.pronouns}</p>
                    ) : null}
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {artmaker.medium.slice(0, 5).map((medium) => (
                      <span
                        key={medium}
                        className="rounded-md border border-gray-800 px-2 py-1 text-neutral-300 text-xs"
                      >
                        {medium}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-gray-800 bg-[#101010] p-8 text-neutral-300">
            No artmakers match that search yet.
          </div>
        )}
      </div>
    </main>
  );
}
