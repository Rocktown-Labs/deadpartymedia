import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArtistSpotlightStrip } from "#/components/exhibitions/artist-spotlight-strip.tsx";
import { ArtworkDetailDrawer } from "#/components/exhibitions/artwork-detail-drawer.tsx";
import { ArtworkWallGrid } from "#/components/exhibitions/artwork-wall-grid.tsx";
import {
  ExhibitionFilterBar,
  type ExhibitionSortOption,
} from "#/components/exhibitions/exhibition-filter-bar.tsx";
import { PageTitleHeader } from "#/components/page-title-header.tsx";
import { listArtmakers } from "#/lib/artmakers.functions.ts";
import { listPublishedArtworksPaginated } from "#/lib/artworks.functions.ts";
import { createSeoMeta } from "#/lib/seo.ts";

export interface ExhibitionsSearch {
  artwork?: string;
  medium?: string;
  sort?: ExhibitionSortOption;
}

export const Route = createFileRoute("/exhibitions")({
  component: ExhibitionsPage,
  head: () =>
    createSeoMeta({
      description:
        "Explore Arkansas artwork uploaded by Dead Party Arts artmakers, from painting and digital work to ceramics, clothing, photography, and mixed practice.",
      path: "/exhibitions",
      title: "Exhibitions",
    }),
  loaderDeps: ({ search: { medium, sort } }) => ({ medium, sort }),
  loader: async ({ deps: { medium, sort } }) => {
    const [initialArtworks, artmakers] = await Promise.all([
      listPublishedArtworksPaginated({
        data: { limit: 24, medium, offset: 0, sort: sort ?? "recent" },
      }),
      listArtmakers(),
    ]);
    return { artmakers, initialArtworks };
  },
  validateSearch: (search: Record<string, unknown>): ExhibitionsSearch => ({
    artwork: typeof search.artwork === "string" ? search.artwork : undefined,
    medium: typeof search.medium === "string" ? search.medium : undefined,
    sort:
      typeof search.sort === "string" && ["recent", "available", "title"].includes(search.sort)
        ? (search.sort as ExhibitionSortOption)
        : undefined,
  }),
});

function ExhibitionsPage() {
  const { artmakers, initialArtworks } = Route.useLoaderData();
  const { artwork, medium, sort } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const activeSort: ExhibitionSortOption = sort ?? "recent";

  const handleSelectMedium = (nextMedium?: string) => {
    void navigate({
      search: (prev) => ({
        ...prev,
        medium: nextMedium,
      }),
    });
  };

  const handleSelectSort = (nextSort: ExhibitionSortOption) => {
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
        <PageTitleHeader
          eyebrow="Exhibition Directory"
          title="EXHIBITIONS"
          description="Explore Arkansas artwork and creators across mediums. Discover original paintings, prints, sculptures, digital works, and custom commissions."
        />

        {/* Horizontal artist spotlight strip with Explore All */}
        <ArtistSpotlightStrip artmakers={artmakers} />

        {/* Category pills and sort controls */}
        <ExhibitionFilterBar
          activeMedium={medium}
          activeSort={activeSort}
          totalCount={initialArtworks.totalCount}
          groupCounts={initialArtworks.groupCounts}
          onSelectMedium={handleSelectMedium}
          onSelectSort={handleSelectSort}
        />

        {/* Responsive artwork grid with infinite scroll */}
        <ArtworkWallGrid
          initialData={initialArtworks}
          medium={medium}
          sort={activeSort}
          onSelectArtwork={handleSelectArtwork}
        />

        {/* URL-driven modal/bottom sheet for artwork inspection */}
        <ArtworkDetailDrawer
          artworkIdentifier={artwork}
          artworks={initialArtworks.items}
          onClose={handleCloseArtwork}
        />
      </div>
    </main>
  );
}
