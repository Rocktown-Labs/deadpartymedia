import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, Instagram, MapPin } from "lucide-react";
import { getArtmakerBySlug } from "#/lib/artmakers.functions.ts";
import { listPublishedArtworksByArtmakerSlug } from "#/lib/artworks.functions.ts";
import { createSeoMeta, getAbsoluteUrl } from "#/lib/seo.ts";

export const Route = createFileRoute("/artmakers/$slug")({
  component: ArtmakerProfile,
  head: ({ loaderData }) => {
    const artmaker = loaderData?.artmaker;
    const description = artmaker
      ? `${artmaker.name} is an Arkansas artmaker in ${artmaker.city}, ${artmaker.state}, working in ${artmaker.medium.join(", ")}.`
      : "Arkansas artmaker profile on Dead Party Arts.";

    return {
      ...createSeoMeta({
        description,
        image: artmaker?.image,
        path: artmaker ? `/artmakers/${artmaker.slug}` : "/artmakers",
        title: artmaker?.name ?? "Artmaker",
        type: "profile",
      }),
      scripts: artmaker
        ? [
            {
              type: "application/ld+json",
              children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "Person",
                description,
                image: artmaker.image ?? undefined,
                name: artmaker.name,
                sameAs: [artmaker.instagramUrl],
                url: getAbsoluteUrl(`/artmakers/${artmaker.slug}`),
                workLocation: {
                  "@type": "Place",
                  address: {
                    "@type": "PostalAddress",
                    addressLocality: artmaker.city,
                    addressRegion: artmaker.state,
                  },
                },
              }),
            },
          ]
        : [],
    };
  },
  loader: async ({ params }) => {
    const [artmaker, artworks] = await Promise.all([
      getArtmakerBySlug({ data: { slug: params.slug } }),
      listPublishedArtworksByArtmakerSlug({ data: { slug: params.slug } }),
    ]);

    if (!artmaker) {
      throw notFound();
    }

    return { artmaker, artworks };
  },
});

function ArtmakerProfile() {
  const { artmaker, artworks } = Route.useLoaderData();

  return (
    <main className="px-5 pt-40 pb-20">
      <div className="mx-auto max-w-6xl">
        <Link
          to="/artmakers"
          className="mb-8 inline-flex items-center gap-2 font-black text-[#7CFC00] text-xs uppercase tracking-[0.22em] no-underline"
        >
          <ArrowLeft className="size-4" />
          Back to Artmakers
        </Link>

        <section className="border border-neutral-800 bg-[#101010]">
          <div className="grid gap-8 p-5 md:grid-cols-[220px_1fr] md:p-8">
            <div className="grid aspect-square place-items-center border border-neutral-800 bg-[#080808]">
              <span className="font-black text-7xl text-[#7CFC00]">
                {artmaker.name.slice(0, 1).toUpperCase()}
              </span>
            </div>
            <div>
              <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
                <div>
                  <h1 className="font-black text-5xl leading-none tracking-tighter">
                    {artmaker.name}
                  </h1>
                  {artmaker.showPronouns && artmaker.pronouns ? (
                    <p className="mt-3 text-neutral-400">{artmaker.pronouns}</p>
                  ) : null}
                </div>
                <a
                  href={artmaker.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-11 items-center gap-2 border border-neutral-700 px-4 font-black text-white text-xs uppercase tracking-[0.18em] no-underline hover:border-[#7CFC00] hover:text-[#7CFC00]"
                >
                  <Instagram className="size-4" />@{artmaker.instagramUsername}
                </a>
              </div>

              <p className="mt-5 flex items-center gap-2 text-neutral-400">
                <MapPin className="size-4 text-[#7CFC00]" />
                {artmaker.city}, {artmaker.state}
              </p>

              {artmaker.bio ? (
                <p className="mt-6 max-w-3xl text-neutral-300 leading-7">{artmaker.bio}</p>
              ) : (
                <p className="mt-6 max-w-3xl text-neutral-500 leading-7">
                  This profile is live. Artwork uploads, featured posts, and events are queued for
                  the next phase.
                </p>
              )}

              <div className="mt-8 flex flex-wrap gap-2">
                {artmaker.medium.map((medium) => (
                  <span
                    key={medium}
                    className="border border-[#7CFC00]/40 bg-[#7CFC00]/10 px-3 py-2 text-[#7CFC00] text-sm"
                  >
                    {medium}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="border border-neutral-800 bg-[#101010] p-5">
            <p className="font-black text-3xl text-[#7CFC00]">{artmaker.artworkCount}</p>
            <p className="mt-2 text-neutral-500 text-sm uppercase tracking-[0.18em]">Artworks</p>
          </div>
          <div className="border border-neutral-800 bg-[#101010] p-5 md:col-span-2">
            <h2 className="font-black text-xl">Artwork wall</h2>
            <p className="mt-2 text-neutral-400 text-sm leading-6">
              Published uploads from this artist appear here and on the Exhibitions page.
            </p>
          </div>
        </section>

        {artworks.length > 0 ? (
          <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {artworks.map((artwork) => (
              <article
                key={artwork.id}
                className="overflow-hidden rounded-lg border border-neutral-800 bg-[#101010]"
              >
                <img
                  src={artwork.image}
                  alt={artwork.title}
                  className="aspect-square w-full object-cover"
                />
                <div className="p-5">
                  <p className="text-[#7CFC00] text-xs uppercase tracking-[0.2em]">
                    {artwork.medium ?? "Mixed practice"}
                  </p>
                  <h3 className="mt-2 font-black text-xl">{artwork.title}</h3>
                  {artwork.description ? (
                    <p className="mt-3 line-clamp-3 text-neutral-400 text-sm leading-6">
                      {artwork.description}
                    </p>
                  ) : null}
                </div>
              </article>
            ))}
          </section>
        ) : null}
      </div>
    </main>
  );
}
