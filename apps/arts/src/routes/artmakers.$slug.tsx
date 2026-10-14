import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { Image } from "@unpic/react";
import {
  ArrowLeft,
  BadgeDollarSign,
  CalendarPlus,
  ImageIcon,
  Instagram,
  MapPin,
} from "lucide-react";
import { ArtworkDetailDrawer } from "#/components/exhibitions/artwork-detail-drawer.tsx";
import { getArtmakerBySlug } from "#/lib/artmakers.functions.ts";
import { listPublishedArtworksByArtmakerSlug } from "#/lib/artworks.functions.ts";
import { createSeoMeta, getAbsoluteUrl } from "#/lib/seo.ts";

export interface ArtmakerProfileSearch {
  artwork?: string;
}

type ArtmakerProfileLoaderData = {
  artmaker: NonNullable<Awaited<ReturnType<typeof getArtmakerBySlug>>>;
  artworks: Awaited<ReturnType<typeof listPublishedArtworksByArtmakerSlug>>;
};

export const Route = createFileRoute("/artmakers/$slug")({
  component: ArtmakerProfile,
  head: ({ loaderData }) => {
    // The CLI-generated route tree is typeless (`as any`), so assert the
    // loader shape here instead of relying on inference.
    const artmaker = (loaderData as ArtmakerProfileLoaderData | undefined)?.artmaker;
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
              type: "application/ld+json",
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
  validateSearch: (search: Record<string, unknown>): ArtmakerProfileSearch => ({
    artwork: typeof search.artwork === "string" ? search.artwork : undefined,
  }),
});

function ArtmakerProfile() {
  const { artmaker, artworks } = Route.useLoaderData() as ArtmakerProfileLoaderData;
  const { artwork } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const artworkCount = artworks.length || artmaker.artworkCount;
  const featuredArtwork = artworks[0];
  const galleryPreview = artworks.slice(0, 8);

  const handleSelectArtwork = (selectedArtwork: { id: number; slug?: string }) => {
    void navigate({
      search: (prev) => ({
        ...prev,
        artwork: selectedArtwork.slug ?? String(selectedArtwork.id),
      }),
    });
  };

  const handleCloseArtwork = () => {
    void navigate({
      search: (prev) => ({
        ...prev,
        artwork: undefined,
      }),
    });
  };

  return (
    <main className="px-5 pb-20 pt-[calc(var(--navbar-offset)+1.5rem)]">
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
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => handleSelectArtwork(featuredArtwork)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleSelectArtwork(featuredArtwork);
                      }
                    }}
                    className="group relative h-full min-h-64 w-full cursor-pointer overflow-hidden transition-[border-color,transform] active:scale-[0.99] [touch-action:manipulation]"
                    aria-label={`View ${featuredArtwork.title}`}
                  >
                    <Image
                      src={featuredArtwork.image}
                      alt={featuredArtwork.title}
                      width={720}
                      height={720}
                      className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-3 backdrop-blur-xs">
                      <p className="font-black text-xs text-white group-hover:text-[#7CFC00]">
                        {featuredArtwork.title}
                      </p>
                      <p className="text-[11px] text-neutral-400">
                        {featuredArtwork.medium ?? "Featured Piece"}
                      </p>
                    </div>
                  </div>
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
            <p className="font-black text-3xl text-[#7CFC00]">{artworkCount}</p>
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
              {artworks.some((item) => item.forSale) ? (
                <p className="inline-flex items-center gap-2 text-neutral-400 text-sm">
                  <BadgeDollarSign className="size-4 text-[#7CFC00]" />
                  Some pieces are marked available
                </p>
              ) : null}
            </div>

            {/* 2-column mobile / 3-4 column desktop responsive touch grid */}
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5 md:grid-cols-3 xl:grid-cols-4">
              {galleryPreview.map((item) => (
                <article
                  key={item.id}
                  onClick={() => handleSelectArtwork(item)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleSelectArtwork(item);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  className="group relative flex cursor-pointer flex-col overflow-hidden rounded-xl border border-neutral-800/80 bg-[#101010] text-left transition-[border-color,transform] duration-150 active:scale-[0.98] hover:border-[#7CFC00] [touch-action:manipulation] [-webkit-tap-highlight-color:transparent]"
                >
                  <div className="relative aspect-square w-full overflow-hidden bg-neutral-950">
                    <Image
                      src={item.image}
                      alt={item.title}
                      width={480}
                      height={480}
                      className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    {item.forSale ? (
                      <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full border border-[#7CFC00]/50 bg-black/80 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#7CFC00] backdrop-blur-md">
                        <BadgeDollarSign className="size-3" />
                        <span>Available</span>
                      </div>
                    ) : null}
                  </div>

                  <div className="flex flex-1 flex-col justify-between p-3 sm:p-4">
                    <div>
                      <p className="truncate text-[10px] font-black uppercase tracking-[0.2em] text-[#7CFC00]">
                        {item.medium ?? "Mixed practice"}
                      </p>
                      <h3 className="mt-1 line-clamp-1 font-black text-sm tracking-tight text-white group-hover:text-[#7CFC00] sm:text-base">
                        {item.title}
                      </h3>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-xs text-neutral-400">
                      {item.year ? (
                        <span className="text-[11px] text-neutral-500">{item.year}</span>
                      ) : (
                        <span />
                      )}
                      {item.forSale ? (
                        <span className="text-[11px] font-bold text-[#7CFC00]">For Sale</span>
                      ) : null}
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {artworks.length > galleryPreview.length ? (
              <div className="mt-8 flex justify-center">
                <Link
                  to="/artmakers/$slug/gallery"
                  params={{ slug: artmaker.slug }}
                  className="inline-flex h-11 items-center gap-2 rounded-xl border border-neutral-700 bg-[#121212] px-5 font-black text-white text-xs uppercase tracking-[0.18em] no-underline transition-all hover:border-[#7CFC00] hover:text-[#7CFC00] active:scale-95"
                >
                  View full gallery ({artworks.length})
                  <ImageIcon className="size-4" />
                </Link>
              </div>
            ) : null}
          </section>
        ) : null}

        {/* URL-driven modal/bottom sheet for artwork inspection */}
        <ArtworkDetailDrawer
          artworkIdentifier={artwork}
          artworks={artworks}
          onClose={handleCloseArtwork}
        />
      </div>
    </main>
  );
}
