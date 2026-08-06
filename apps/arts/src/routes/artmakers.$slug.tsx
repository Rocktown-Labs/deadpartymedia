import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Image } from "@unpic/react";
import {
  ArrowLeft,
  BadgeDollarSign,
  CalendarPlus,
  ImageIcon,
  Instagram,
  MapPin,
} from "lucide-react";
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
  const featuredArtwork = artworks[0];
  const galleryPreview = artworks.slice(0, 6);

  return (
    <main className="px-5 pt-32 pb-20">
      <div className="mx-auto max-w-7xl">
        <Link
          to="/artmakers"
          className="mb-8 inline-flex items-center gap-2 font-black text-[#7CFC00] text-xs uppercase tracking-[0.22em] no-underline"
        >
          <ArrowLeft className="size-4" />
          Back to Artmakers
        </Link>

        <section className="border border-neutral-800 bg-[#101010]">
          <div className="grid gap-8 p-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(360px,1.05fr)] lg:p-8">
            <div>
              <div className="mb-6 flex flex-wrap items-center gap-3">
                {artmaker.medium.slice(0, 3).map((medium) => (
                  <span
                    key={medium}
                    className="border border-[#7CFC00]/40 bg-[#7CFC00]/10 px-3 py-2 text-[#7CFC00] text-xs uppercase tracking-[0.14em]"
                  >
                    {medium}
                  </span>
                ))}
              </div>

              <h1 className="max-w-3xl font-black text-5xl leading-none tracking-tight md:text-7xl">
                {artmaker.name}
              </h1>
              {artmaker.showPronouns && artmaker.pronouns ? (
                <p className="mt-3 text-neutral-400">{artmaker.pronouns}</p>
              ) : null}

              <p className="mt-5 flex items-center gap-2 text-neutral-400">
                <MapPin className="size-4 text-[#7CFC00]" />
                {artmaker.city}, {artmaker.state}
              </p>

              <p className="mt-6 max-w-3xl text-neutral-300 leading-7">
                {artmaker.bio ??
                  "This artmaker profile is live. Published uploads will appear here as the artist adds work."}
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href={artmaker.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-11 items-center gap-2 border border-neutral-700 px-4 font-black text-white text-xs uppercase tracking-[0.18em] no-underline hover:border-[#7CFC00] hover:text-[#7CFC00]"
                >
                  <Instagram className="size-4" />@{artmaker.instagramUsername}
                </a>
                <a
                  href={artmaker.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-11 items-center gap-2 border border-[#7CFC00] bg-[#7CFC00] px-4 font-black text-black text-xs uppercase tracking-[0.18em] no-underline hover:bg-[#a5ff43]"
                >
                  <CalendarPlus className="size-4" />
                  Commission
                </a>
                <Link
                  to="/exhibitions"
                  search={{ medium: undefined }}
                  className="inline-flex h-11 items-center gap-2 border border-neutral-700 px-4 font-black text-white text-xs uppercase tracking-[0.18em] no-underline hover:border-[#7CFC00] hover:text-[#7CFC00]"
                >
                  <ImageIcon className="size-4" />
                  Exhibitions
                </Link>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-[160px_minmax(0,1fr)]">
              <div className="grid aspect-square place-items-center overflow-hidden border border-neutral-800 bg-[#080808]">
                {artmaker.image ? (
                  <Image
                    src={artmaker.image}
                    alt={artmaker.name}
                    width={320}
                    height={320}
                    className="aspect-square w-full object-cover"
                  />
                ) : (
                  <span className="font-black text-7xl text-[#7CFC00]">
                    {artmaker.name.slice(0, 1).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="grid min-h-64 border border-neutral-800 bg-[#080808]">
                {featuredArtwork ? (
                  <Image
                    src={featuredArtwork.image}
                    alt={featuredArtwork.title}
                    width={720}
                    height={720}
                    className="h-full min-h-64 w-full object-cover"
                  />
                ) : (
                  <div className="grid place-items-center p-6 text-center">
                    <div>
                      <ImageIcon className="mx-auto size-9 text-[#7CFC00]" />
                      <p className="mt-4 font-black text-neutral-200">Artwork coming soon</p>
                      <p className="mt-2 text-neutral-500 text-sm">
                        This page is ready for the artist's first public upload.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-[240px_minmax(0,1fr)]">
          <div className="border border-neutral-800 bg-[#101010] p-5">
            <p className="font-black text-3xl text-[#7CFC00]">{artmaker.artworkCount}</p>
            <p className="mt-2 text-neutral-500 text-sm uppercase tracking-[0.18em]">Artworks</p>
          </div>
          <div className="border border-neutral-800 bg-[#101010] p-5">
            <h2 className="font-black text-xl">Practice</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {artmaker.medium.map((medium) => (
                <span
                  key={medium}
                  className="border border-neutral-700 px-3 py-2 text-neutral-300 text-sm"
                >
                  {medium}
                </span>
              ))}
            </div>
          </div>
        </section>

        {artworks.length > 0 ? (
          <section className="mt-8">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="font-black text-[#7CFC00] text-xs uppercase tracking-[0.24em]">
                  Artwork wall
                </p>
                <h2 className="mt-2 font-black text-3xl tracking-tight">Published work</h2>
              </div>
              {artworks.some((artwork) => artwork.forSale) ? (
                <p className="inline-flex items-center gap-2 text-neutral-400 text-sm">
                  <BadgeDollarSign className="size-4 text-[#7CFC00]" />
                  Some pieces are marked available
                </p>
              ) : null}
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {galleryPreview.map((artwork) => (
                <article
                  key={artwork.id}
                  className="overflow-hidden border border-neutral-800 bg-[#101010]"
                >
                  <Image
                    src={artwork.image}
                    alt={artwork.title}
                    width={640}
                    height={640}
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
                    <div className="mt-4 flex flex-wrap gap-2 text-neutral-500 text-xs uppercase tracking-[0.14em]">
                      {artwork.year ? <span>{artwork.year}</span> : null}
                      {artwork.forSale ? <span>Available</span> : null}
                    </div>
                  </div>
                </article>
              ))}
            </div>
            {artworks.length > galleryPreview.length ? (
              <div className="mt-6 flex justify-center">
                <Link
                  to="/artmakers/$slug/gallery"
                  params={{ slug: artmaker.slug }}
                  className="inline-flex h-11 items-center gap-2 border border-neutral-700 px-4 font-black text-white text-xs uppercase tracking-[0.18em] no-underline hover:border-[#7CFC00] hover:text-[#7CFC00]"
                >
                  View full gallery
                  <ImageIcon className="size-4" />
                </Link>
              </div>
            ) : null}
          </section>
        ) : null}
      </div>
    </main>
  );
}
