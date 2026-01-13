import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getAbsoluteUrl,
  getImageUrl,
  stripHtml,
  truncateText,
  sanitizeDescription,
  getOgImageUrl,
  getSiteDefaults,
} from "@/lib/seo";

describe("SEO helpers", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  describe("getAbsoluteUrl", () => {
    it("should return absolute URL for relative paths", () => {
      expect(getAbsoluteUrl("/article/test")).toBe(
        "https://www.deadpartymedia.com/article/test"
      );
    });

    it("should return absolute URL for paths without leading slash", () => {
      expect(getAbsoluteUrl("article/test")).toBe(
        "https://www.deadpartymedia.com/article/test"
      );
    });

    it("should return absolute URL as-is", () => {
      expect(getAbsoluteUrl("https://example.com/path")).toBe(
        "https://example.com/path"
      );
    });

    it("should return absolute URL for http URLs", () => {
      expect(getAbsoluteUrl("http://example.com/path")).toBe(
        "http://example.com/path"
      );
    });
  });

  describe("getImageUrl", () => {
    it("should return default OG image for null/undefined", () => {
      expect(getImageUrl(null)).toBe(
        "https://www.deadpartymedia.com/images/dead-party-logo-og.jpg"
      );
      expect(getImageUrl(undefined)).toBe(
        "https://www.deadpartymedia.com/images/dead-party-logo-og.jpg"
      );
    });

    it("should return absolute URL for relative paths", () => {
      expect(getImageUrl("/images/test.jpg")).toBe(
        "https://www.deadpartymedia.com/images/test.jpg"
      );
    });

    it("should return absolute URL as-is", () => {
      expect(getImageUrl("https://example.com/image.jpg")).toBe(
        "https://example.com/image.jpg"
      );
    });

    it("should handle media URLs with NEXT_PUBLIC_MEDIA_URL", () => {
      process.env.NEXT_PUBLIC_MEDIA_URL = "https://media.example.com";
      expect(getImageUrl("/media/articles/image.jpg")).toBe(
        "https://media.example.com/media/articles/image.jpg"
      );
    });

    it("should handle media URLs without NEXT_PUBLIC_MEDIA_URL", () => {
      delete process.env.NEXT_PUBLIC_MEDIA_URL;
      expect(getImageUrl("/media/articles/image.jpg")).toBe(
        "https://www.deadpartymedia.com/media/articles/image.jpg"
      );
    });
  });

  describe("stripHtml", () => {
    it("should remove HTML tags", () => {
      expect(stripHtml("<p>Hello World</p>")).toBe("Hello World");
    });

    it("should decode HTML entities", () => {
      expect(stripHtml("Hello &amp; World")).toBe("Hello & World");
      expect(stripHtml("&lt;tag&gt;")).toBe("<tag>");
      expect(stripHtml("&quot;quoted&quot;")).toBe('"quoted"');
    });

    it("should handle null/undefined", () => {
      expect(stripHtml(null)).toBe("");
      expect(stripHtml(undefined)).toBe("");
    });

    it("should trim whitespace", () => {
      expect(stripHtml("  <p>Text</p>  ")).toBe("Text");
    });
  });

  describe("truncateText", () => {
    it("should truncate text longer than maxLength", () => {
      const longText = "a".repeat(200);
      const result = truncateText(longText, 160);
      expect(result.length).toBe(160);
      expect(result.endsWith("...")).toBe(true);
    });

    it("should not truncate text shorter than maxLength", () => {
      const shortText = "Short text";
      expect(truncateText(shortText, 160)).toBe(shortText);
    });

    it("should handle empty string", () => {
      expect(truncateText("", 160)).toBe("");
    });
  });

  describe("sanitizeDescription", () => {
    it("should sanitize HTML and truncate", () => {
      const html = "<p>" + "a".repeat(200) + "</p>";
      const result = sanitizeDescription(html, "fallback", 160);
      expect(result.length).toBe(160);
      expect(result.endsWith("...")).toBe(true);
      expect(result).not.toContain("<p>");
    });

    it("should use fallback for null/undefined", () => {
      expect(sanitizeDescription(null, "fallback")).toBe("fallback");
      expect(sanitizeDescription(undefined, "fallback")).toBe("fallback");
    });

    it("should use fallback for empty string after stripping HTML", () => {
      expect(sanitizeDescription("<p></p>", "fallback")).toBe("fallback");
    });
  });

  describe("getOgImageUrl", () => {
    it("should generate OG image URL for article", () => {
      expect(getOgImageUrl("article", "test-slug")).toBe(
        "https://www.deadpartymedia.com/api/og/article/test-slug"
      );
    });

    it("should generate OG image URL for event", () => {
      expect(getOgImageUrl("event", "test-slug")).toBe(
        "https://www.deadpartymedia.com/api/og/event/test-slug"
      );
    });

    it("should generate OG image URL for artist", () => {
      expect(getOgImageUrl("artist", "test-slug")).toBe(
        "https://www.deadpartymedia.com/api/og/artist/test-slug"
      );
    });
  });

  describe("getSiteDefaults", () => {
    it("should return site defaults", () => {
      const defaults = getSiteDefaults();
      expect(defaults.siteUrl).toBe("https://www.deadpartymedia.com");
      expect(defaults.siteName).toBe("Dead Party Media");
      expect(defaults.defaultDescription).toBe(
        "Your #1 digital outlet for Arkansas music and live events. We cover artists across all genres, host events, and deliver exclusive content and interviews."
      );
      expect(defaults.defaultOgImage).toBe(
        "https://www.deadpartymedia.com/images/dead-party-logo-og.jpg"
      );
    });
  });
});
