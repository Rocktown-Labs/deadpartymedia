import { describe, expect, it } from "vite-plus/test";
import { z } from "zod";
import { createArtworkDrafts } from "#/lib/artwork-drafts.ts";

// Mirrors updateCurrentArtwork validation schema
const updateCurrentArtworkSchema = z.object({
  description: z.string().max(700, "Description must stay under 700 characters").optional(),
  forSale: z.boolean(),
  id: z.number(),
  medium: z.string().max(80, "Medium must stay under 80 characters").optional(),
  price: z.string().optional(),
  status: z.enum(["draft", "published"]),
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(120, "Title must stay under 120 characters"),
  year: z.string().max(20, "Year must stay under 20 characters").optional(),
});

function parsePriceCents(price?: string) {
  const trimmed = price?.trim();
  if (!trimmed) {
    return null;
  }

  const amount = Number(trimmed.replaceAll(/[^0-9.-]/g, ""));
  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  return Math.round(amount * 100);
}

function formatPriceDollars(priceCents: number | null | undefined) {
  if (!priceCents || priceCents <= 0) {
    return "";
  }
  return (priceCents / 100).toFixed(2);
}

describe("Artwork Editing and Preview Helpers", () => {
  describe("updateCurrentArtwork validation schema", () => {
    it("should validate and trim a valid artwork edit payload", () => {
      const payload = {
        description: "An acrylic exploration of Arkansas river landscapes.",
        forSale: true,
        id: 42,
        medium: "Acrylic on wood panel",
        price: "450.00",
        status: "published" as const,
        title: "  Ozark Evening Ridge  ",
        year: "2026",
      };

      const result = updateCurrentArtworkSchema.parse(payload);
      expect(result.title).toBe("Ozark Evening Ridge");
      expect(result.id).toBe(42);
      expect(result.status).toBe("published");
      expect(result.forSale).toBe(true);
    });

    it("should reject an empty title", () => {
      const payload = {
        forSale: false,
        id: 10,
        status: "draft" as const,
        title: "   ",
      };

      const result = updateCurrentArtworkSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it("should reject title exceeding 120 characters", () => {
      const payload = {
        forSale: false,
        id: 10,
        status: "published" as const,
        title: "A".repeat(121),
      };

      const result = updateCurrentArtworkSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it("should accept optional fields omitted", () => {
      const payload = {
        forSale: false,
        id: 5,
        status: "draft" as const,
        title: "Minimal Piece",
      };

      const result = updateCurrentArtworkSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });
  });

  describe("price parsing and formatting", () => {
    it("should parse standard dollar strings into cents", () => {
      expect(parsePriceCents("250")).toBe(25000);
      expect(parsePriceCents("$450.50")).toBe(45050);
      expect(parsePriceCents("  1,200.00 ")).toBe(120000);
    });

    it("should return null for empty or invalid price strings", () => {
      expect(parsePriceCents("")).toBeNull();
      expect(parsePriceCents(undefined)).toBeNull();
      expect(parsePriceCents("abc")).toBeNull();
      expect(parsePriceCents("-50")).toBeNull();
    });

    it("should format cents to dollar strings for the edit modal", () => {
      expect(formatPriceDollars(25000)).toBe("250.00");
      expect(formatPriceDollars(45050)).toBe("450.50");
      expect(formatPriceDollars(null)).toBe("");
      expect(formatPriceDollars(undefined)).toBe("");
      expect(formatPriceDollars(0)).toBe("");
    });
  });

  describe("artwork draft previews", () => {
    it("should construct drafts with previewUrl from metadata base URL", () => {
      const drafts = createArtworkDrafts(
        [
          {
            file: { name: "sunset-acrylic.png" },
            objectInfo: { key: "artworks/sunset-acrylic-123.png" },
          },
        ],
        { publicBaseUrl: "https://media.deadpartymedia.com" },
      );

      expect(drafts).toHaveLength(1);
      expect(drafts[0]?.title).toBe("Sunset Acrylic");
      expect(drafts[0]?.previewUrl).toBe(
        "https://media.deadpartymedia.com/artworks/sunset-acrylic-123.png",
      );
    });

    it("should handle direct url in candidate file", () => {
      const drafts = createArtworkDrafts([
        {
          file: { name: "direct-image.webp" },
          key: "artworks/direct-image.webp",
          url: "https://custom-cdn.example.com/direct-image.webp",
        },
      ]);

      expect(drafts).toHaveLength(1);
      expect(drafts[0]?.previewUrl).toBe("https://custom-cdn.example.com/direct-image.webp");
    });
  });
});
