import { describe, expect, it } from "vite-plus/test";
import { MEDIUM_GROUPS, getMediumGroupForMedium } from "#/lib/mediums.ts";

describe("medium grouping", () => {
  it("assigns a medium to the first group whose keyword matches", () => {
    // "Acrylic" appears in the Painting group's keyword list.
    expect(getMediumGroupForMedium("Acrylic paint on a vinyl record").slug).toBe("painting");
    // "Paper" is an Objects keyword and Painting is checked first but has no hit.
    expect(getMediumGroupForMedium("Pen on paper + digital editing").slug).toBe("objects");
  });

  it("is case-insensitive", () => {
    expect(getMediumGroupForMedium("CERAMICS").slug).toBe("objects");
    expect(getMediumGroupForMedium("crochet and amigurumi").slug).toBe("clothing");
  });

  it("falls back to mixed-practice for blank or unmatched mediums", () => {
    const fallback = MEDIUM_GROUPS.at(-1)?.slug;
    expect(fallback).toBe("mixed-practice");
    expect(getMediumGroupForMedium("").slug).toBe(fallback);
    expect(getMediumGroupForMedium("shadowbox installation").slug).toBe(fallback);
  });

  it("has unique slugs so group counts can never collide", () => {
    const slugs = MEDIUM_GROUPS.map((group) => group.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});
