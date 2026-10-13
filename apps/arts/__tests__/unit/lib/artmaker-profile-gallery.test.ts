import { describe, expect, it } from "vite-plus/test";
import type { ArtworkListItem } from "#/lib/artworks.functions.ts";

describe("Artmaker profile and gallery filtering logic", () => {
  const sampleArtworks: ArtworkListItem[] = [
    {
      artmakerId: 1,
      artmakerName: "Isaac Bristow",
      artmakerSlug: "isaac-bristow",
      city: "Little Rock",
      createdAt: new Date("2026-10-01T12:00:00Z"),
      description: "Fine line floral work",
      forSale: false,
      id: 101,
      image: "https://example.com/art1.jpg",
      medium: "Tattoo",
      priceCents: null,
      slug: "floral-tattoo",
      state: "AR",
      status: "published",
      title: "Floral Sleeve",
      year: "2026",
    },
    {
      artmakerId: 1,
      artmakerName: "Isaac Bristow",
      artmakerSlug: "isaac-bristow",
      city: "Little Rock",
      createdAt: new Date("2026-10-05T12:00:00Z"),
      description: "Original oil painting",
      forSale: true,
      id: 102,
      image: "https://example.com/art2.jpg",
      medium: "Oil on Canvas",
      priceCents: 45000,
      slug: "delta-sunset",
      state: "AR",
      status: "published",
      title: "Delta Sunset",
      year: "2025",
    },
    {
      artmakerId: 1,
      artmakerName: "Isaac Bristow",
      artmakerSlug: "isaac-bristow",
      city: "Little Rock",
      createdAt: new Date("2026-10-10T12:00:00Z"),
      description: "Ink drawing on paper",
      forSale: true,
      id: 103,
      image: "https://example.com/art3.jpg",
      medium: "Ink on Paper",
      priceCents: 15000,
      slug: "crow-sketch",
      state: "AR",
      status: "published",
      title: "Crow Study",
      year: "2026",
    },
  ];

  it("calculates accurate artwork count based on uploaded items", () => {
    const artmakerMetadata = { artworkCount: 1 }; // stale count
    const actualCount = sampleArtworks.length || artmakerMetadata.artworkCount;
    expect(actualCount).toBe(3);
  });

  it("filters artworks by medium case-insensitively", () => {
    const filterByMedium = (list: ArtworkListItem[], targetMedium?: string) => {
      if (!targetMedium) return list;
      const target = targetMedium.toLowerCase();
      return list.filter((item) => (item.medium ?? "").toLowerCase().includes(target));
    };

    const tattooWorks = filterByMedium(sampleArtworks, "tattoo");
    expect(tattooWorks).toHaveLength(1);
    expect(tattooWorks[0].title).toBe("Floral Sleeve");

    const inkWorks = filterByMedium(sampleArtworks, "ink");
    expect(inkWorks).toHaveLength(1);
    expect(inkWorks[0].title).toBe("Crow Study");
  });

  it("filters artworks by forSale availability", () => {
    const availableWorks = sampleArtworks.filter((item) => item.forSale);
    expect(availableWorks).toHaveLength(2);
    expect(availableWorks.map((w) => w.title)).toEqual(["Delta Sunset", "Crow Study"]);
  });

  it("sorts artworks with available items first when requested", () => {
    const sorted = [...sampleArtworks].sort((a, b) => {
      if (a.forSale !== b.forSale) {
        return a.forSale ? -1 : 1;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    expect(sorted[0].forSale).toBe(true);
    expect(sorted[1].forSale).toBe(true);
    expect(sorted[2].forSale).toBe(false);
  });

  it("sorts artworks alphabetically by title", () => {
    const sorted = [...sampleArtworks].sort((a, b) => a.title.localeCompare(b.title));
    expect(sorted.map((w) => w.title)).toEqual(["Crow Study", "Delta Sunset", "Floral Sleeve"]);
  });
});
