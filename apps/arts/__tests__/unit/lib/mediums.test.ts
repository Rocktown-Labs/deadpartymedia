import { Pen } from "lucide-react";
import { describe, expect, it } from "vite-plus/test";
import { getMediumGroup, MEDIUM_GROUPS, getMediumGroupForMedium } from "#/lib/mediums.ts";

describe("medium grouping", () => {
  it("assigns a medium to the first group whose keyword matches", () => {
    // "Acrylic" appears in the Painting group's keyword list.
    expect(getMediumGroupForMedium("Acrylic paint on a vinyl record").slug).toBe("painting");
    // "Digital" is a keyword of the Digital group, so digital editing counts
    // as digital work even when mixed with physical media.
    expect(getMediumGroupForMedium("Pen on paper + digital editing").slug).toBe("digital");
  });

  it("maps bare group labels to their own group", () => {
    expect(getMediumGroupForMedium("Digital").slug).toBe("digital");
    expect(getMediumGroupForMedium("Clothing").slug).toBe("clothing");
    expect(getMediumGroupForMedium("Objects").slug).toBe("objects");
    expect(getMediumGroupForMedium("Mixed Practice").slug).toBe("mixed-practice");
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

  it("uses the Pen icon for the Drawing medium group", () => {
    expect(getMediumGroup("drawing")?.icon).toBe(Pen);
  });
});
