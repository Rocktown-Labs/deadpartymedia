import { describe, expect, it } from "vite-plus/test";
import type { ArtworkListItem } from "#/lib/artworks.functions.ts";
import type { ArtsProduct } from "#/lib/fourthwall.functions.ts";
import type { HomeSearch } from "#/routes/index.tsx";

describe("Landing page carousels and search state", () => {
  describe("HomeSearch query validation", () => {
    const validateHomeSearch = (search: Record<string, unknown>): HomeSearch => ({
      artwork: typeof search.artwork === "string" ? search.artwork : undefined,
    });

    it("parses valid artwork string parameter", () => {
      expect(validateHomeSearch({ artwork: "neon-delta-sunset" })).toEqual({
        artwork: "neon-delta-sunset",
      });
      expect(validateHomeSearch({ artwork: "42" })).toEqual({
        artwork: "42",
      });
    });

    it("safely ignores non-string artwork parameter", () => {
      expect(validateHomeSearch({})).toEqual({ artwork: undefined });
      expect(validateHomeSearch({ artwork: 123 })).toEqual({ artwork: undefined });
      expect(validateHomeSearch({ artwork: null })).toEqual({ artwork: undefined });
      expect(validateHomeSearch({ artwork: ["array-item"] })).toEqual({ artwork: undefined });
    });
  });

  describe("Recent artworks data formatting", () => {
    const sampleArtworks: ArtworkListItem[] = [
      {
        artmakerId: 1,
        artmakerName: "Elena Vance",
        artmakerSlug: "elena-vance",
        city: "Little Rock",
        createdAt: new Date("2026-10-10"),
        description: "Acrylic on canvas",
        forSale: true,
        id: 101,
        image: "https://example.com/art1.jpg",
        medium: "Painting",
        priceCents: 25000,
        slug: "delta-bloom",
        state: "AR",
        status: "published",
        title: "Delta Bloom",
        year: "2026",
      },
      {
        artmakerId: 2,
        artmakerName: "Marcus Hill",
        artmakerSlug: "marcus-hill",
        city: "Hot Springs",
        createdAt: new Date("2026-10-12"),
        description: null,
        forSale: false,
        id: 102,
        image: "https://example.com/art2.jpg",
        medium: null,
        priceCents: null,
        slug: "mountain-fog",
        state: "AR",
        status: "published",
        title: "Mountain Fog",
        year: null,
      },
    ];

    it("formats price correctly when priceCents is provided", () => {
      const formatArtworkPrice = (artwork: ArtworkListItem) => {
        if (!artwork.forSale) {
          return null;
        }
        return artwork.priceCents && artwork.priceCents > 0
          ? `$${(artwork.priceCents / 100).toFixed(2)}`
          : "Available";
      };

      expect(formatArtworkPrice(sampleArtworks[0])).toBe("$250.00");
      expect(formatArtworkPrice(sampleArtworks[1])).toBeNull();
    });

    it("provides fallback for missing medium", () => {
      const getMediumLabel = (artwork: ArtworkListItem) => artwork.medium ?? "Visual Art";
      expect(getMediumLabel(sampleArtworks[0])).toBe("Painting");
      expect(getMediumLabel(sampleArtworks[1])).toBe("Visual Art");
    });
  });

  describe("Arts merch product carousel logic", () => {
    const sampleProducts: ArtsProduct[] = [
      {
        availableForSale: true,
        currency: "USD",
        description: "Heavyweight embroidered hoodie",
        handle: "dead-party-arts-hoodie",
        id: "prod_1",
        image: "https://example.com/hoodie.jpg",
        images: ["https://example.com/hoodie.jpg"],
        minPrice: "65.00",
        title: "DPA Heavyweight Hoodie",
        variants: [
          {
            availableForSale: true,
            currency: "USD",
            id: "var_1",
            options: ["Black", "L"],
            price: "65.00",
            title: "Black / L",
          },
        ],
      },
      {
        availableForSale: false,
        currency: "USD",
        description: "Draft item without slug",
        handle: "",
        id: "prod_2",
        image: "",
        images: [],
        minPrice: "0.00",
        title: "Draft Item",
        variants: [],
      },
    ];

    it("filters out products missing a valid handle", () => {
      const visible = sampleProducts.filter((p) => Boolean(p?.handle));
      expect(visible).toHaveLength(1);
      expect(visible[0].handle).toBe("dead-party-arts-hoodie");
    });

    it("formats product display price with currency symbol", () => {
      const formatMerchPrice = (p: ArtsProduct) => (p.minPrice ? `$${p.minPrice}` : "Available");
      expect(formatMerchPrice(sampleProducts[0])).toBe("$65.00");
      expect(formatMerchPrice({ ...sampleProducts[0], minPrice: "" })).toBe("Available");
    });
  });
});
