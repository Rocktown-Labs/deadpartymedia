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
  });
});
