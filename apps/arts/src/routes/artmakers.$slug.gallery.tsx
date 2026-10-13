import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { Image } from "@unpic/react";
import { ArrowLeft, BadgeDollarSign, Sparkles } from "lucide-react";
import { useMemo } from "react";
import {
  ArtistGalleryFilterBar,
  type ArtistGallerySortOption,
} from "#/components/artmakers/artist-gallery-filter-bar.tsx";
import { ArtworkDetailDrawer } from "#/components/exhibitions/artwork-detail-drawer.tsx";
import { getArtmakerBySlug } from "#/lib/artmakers.functions.ts";
import { listPublishedArtworksByArtmakerSlug } from "#/lib/artworks.functions.ts";
import { createSeoMeta } from "#/lib/seo.ts";

export interface ArtmakerGallerySearch {
  artwork?: string;
  available?: boolean;
  medium?: string;
  sort?: ArtistGallerySortOption;
}

export const Route = createFileRoute("/artmakers/$slug/gallery")({
  component: ArtmakerGallery,
  head: ({ loaderData }) =>
    createSeoMeta({
      description: loaderData?.artmaker
        ? `Full artwork gallery for ${loaderData.artmaker.name} on Dead Party Arts.`
        : "Artmaker gallery on Dead Party Arts.",
      image: loaderData?.artworks[0]?.image ?? loaderData?.artmaker?.image,
      path: loaderData?.artmaker ? `/artmakers/${loaderData.artmaker.slug}/gallery` : "/artmakers",
      title: loaderData?.artmaker ? `${loaderData.artmaker.name} Gallery` : "Artmaker Gallery",
      type: "profile",
    }),
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
  validateSearch: (search: Record<string, unknown>): ArtmakerGallerySearch => ({
    artwork: typeof search.artwork === "string" ? search.artwork : undefined,
    available: search.available === true || search.available === "true" ? true : undefined,
    medium: typeof search.medium === "string" ? search.medium : undefined,
    sort:
      typeof search.sort === "string" && ["recent", "available", "title"].includes(search.sort)
        ? (search.sort as ArtistGallerySortOption)
        : undefined,
  }),
});

function ArtmakerGallery() {
  const { artmaker, artworks } = Route.useLoaderData();
  const { artwork, available, medium, sort } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const activeSort: ArtistGallerySortOption = sort ?? "recent";

  const filteredArtworks = useMemo(() => {
    let list = [...artworks];

    if (available) {
      list = list.filter((item) => item.forSale);
    }

    if (medium) {
      const target = medium.toLowerCase();
      list = list.filter((item) => (item.medium ?? "").toLowerCase().includes(target));
    }

    if (activeSort === "available") {
      list.sort((a, b) => {
        if (a.forSale !== b.forSale) {
          return a.forSale ? -1 : 1;
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    } else if (activeSort === "title") {
      list.sort((a, b) => a.title.localeCompare(b.title));
    } else {
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return list;
  }, [artworks, available, medium, activeSort]);

  const handleSelectMedium = (nextMedium?: string) => {
    void navigate({
      search: (prev) => ({
        ...prev,
        medium: nextMedium,
      }),
    });
  };

  const handleToggleAvailable = () => {
    void navigate({
      search: (prev) => ({
        ...prev,
        available: !available ? true : undefined,
      }),
    });
  };

  const handleSelectSort = (nextSort: ArtistGallerySortOption) => {
    void navigate({
      search: (prev) => ({
        ...prev,
        sort: nextSort,
      }),
    });
  };

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
    <main className="px-4 pb-24 pt-[calc(var(--navbar-offset)+1.5rem)] sm:px-6">
      <div className="container mx-auto max-w-7xl">
        <Link
          to="/artmakers/$slug"
          params={{ slug: artmaker.slug }}
          className="mb-6 inline-flex items-center gap-2 font-black text-[#7CFC00] text-xs uppercase tracking-[0.22em] no-underline transition-colors hover:text-[#a5ff43]"
        >
          <ArrowLeft className="size-4" />
          Back to profile
        </Link>

        <div className="mb-6">
          <p className="font-black text-[#7CFC00] text-xs uppercase tracking-[0.24em]">
            Complete Gallery
          </p>
          <h1 className="mt-2 font-black text-4xl tracking-tight text-white sm:text-5xl">
            {artmaker.name}
          </h1>
          <p className="mt-2 text-sm text-neutral-400">
            {artmaker.city}, {artmaker.state} • {artworks.length} published work
            {artworks.length === 1 ? "" : "s"}
          </p>
        </div>

        {/* Filter bar for the artist's mediums and availability */}
        <ArtistGalleryFilterBar
          activeMedium={medium}
          availableOnly={Boolean(available)}
          activeSort={activeSort}
          totalCount={filteredArtworks.length}
          mediums={artmaker.medium}
          hasForSale={artworks.some((item) => item.forSale)}
          onSelectMedium={handleSelectMedium}
          onToggleAvailable={handleToggleAvailable}
          onSelectSort={handleSelectSort}
        />

        {filteredArtworks.length > 0 ? (
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5 md:grid-cols-3 xl:grid-cols-4">
            {filteredArtworks.map((item) => (
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
        ) : (
          <div className="rounded-2xl border border-neutral-800 bg-[#101010]/90 px-6 py-16 text-center">
            <Sparkles className="mx-auto size-8 text-[#7CFC00]/60" />
            <h3 className="mt-4 font-black text-lg text-white">No Artworks Found</h3>
            <p className="mt-2 text-sm text-neutral-400">
              {available || medium
                ? "No published pieces match your selected filter. Try clearing filters."
                : "No public artwork has been published yet."}
            </p>
          </div>
        )}

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
