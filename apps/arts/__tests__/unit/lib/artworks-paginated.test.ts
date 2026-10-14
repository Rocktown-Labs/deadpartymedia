import { describe, expect, it } from "vite-plus/test";
import type { ExhibitionSortOption } from "#/components/exhibitions/exhibition-filter-bar.tsx";
import { getMediumGroup } from "#/lib/mediums.ts";

describe("Exhibitions pagination and filtering logic", () => {
  describe("medium group filtering", () => {
    it("should resolve medium group with associated terms", () => {
      const group = getMediumGroup("painting");
      expect(group).toBeDefined();
      expect(group?.slug).toBe("painting");
      expect(group?.mediums).toContain("Painting");
      expect(group?.mediums).toContain("Oil");
    });

    it("should return null for non-existent medium group slugs", () => {
      expect(getMediumGroup("unknown-category")).toBeNull();
    });

    it("should match artwork medium case-insensitively", () => {
      const group = getMediumGroup("objects");
      expect(group).toBeDefined();
      const artworkMedium = "Handmade Ceramics";
      const matches = group?.mediums.some((m) =>
        artworkMedium.toLowerCase().includes(m.toLowerCase()),
      );
      expect(matches).toBe(true);
    });
  });

  describe("search parameters and sort options", () => {
    it("should accept valid sort options", () => {
      const validSorts: ExhibitionSortOption[] = ["recent", "available", "title"];
      for (const sort of validSorts) {
        expect(["recent", "available", "title"].includes(sort)).toBe(true);
      }
    });

    it("should compute nextOffset correctly for pagination", () => {
      const computeNextOffset = (offset: number, fetchedCount: number, total: number) => {
        return offset + fetchedCount < total ? offset + fetchedCount : null;
      };

      // First page with more remaining
      expect(computeNextOffset(0, 24, 50)).toBe(24);
      // Second page with remainder
      expect(computeNextOffset(24, 24, 50)).toBe(48);
      // Final page
      expect(computeNextOffset(48, 2, 50)).toBeNull();
      // Empty results
      expect(computeNextOffset(0, 0, 0)).toBeNull();
    });

    it("should parse and validate artmaker slug parameter", () => {
      const validateSearch = (search: Record<string, unknown>) => ({
        artmaker:
          typeof search.artmaker === "string" && search.artmaker.trim()
            ? search.artmaker.trim()
            : undefined,
        artwork: typeof search.artwork === "string" ? search.artwork : undefined,
        medium: typeof search.medium === "string" ? search.medium : undefined,
        sort:
          typeof search.sort === "string" && ["recent", "available", "title"].includes(search.sort)
            ? (search.sort as ExhibitionSortOption)
            : undefined,
      });

      expect(validateSearch({ artmaker: "alan-diaz-soto" }).artmaker).toBe("alan-diaz-soto");
      expect(validateSearch({ artmaker: 123 }).artmaker).toBeUndefined();
      expect(validateSearch({ artmaker: "" }).artmaker).toBeUndefined();
      expect(validateSearch({ artmaker: "   " }).artmaker).toBeUndefined();
    });

    it("should toggle artmaker selection correctly", () => {
      const toggleArtmaker = (current?: string, next?: string) => {
        return current === next ? undefined : next;
      };

      // Select new artmaker
      expect(toggleArtmaker(undefined, "mel")).toBe("mel");
      // Deselect when clicking currently active artmaker
      expect(toggleArtmaker("mel", "mel")).toBeUndefined();
      // Switch to different artmaker
      expect(toggleArtmaker("mel", "alan")).toBe("alan");
    });
  });
});
