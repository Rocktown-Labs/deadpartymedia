import { describe, expect, it } from "vite-plus/test";
import { createSlug } from "#/lib/slug.ts";

describe("createSlug", () => {
  it("should convert artist names into lowercase kebab-case slugs", () => {
    expect(createSlug("John Doe Art")).toBe("john-doe-art");
  });

  it("should strip special characters and punctuation", () => {
    expect(createSlug("Jane & The Art-Makers!!!")).toBe("jane-the-art-makers");
  });

  it("should handle multiple spaces and trim edges", () => {
    expect(createSlug("   Creative   Studio   ")).toBe("creative-studio");
  });
});
