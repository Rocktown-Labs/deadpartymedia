import { Camera, Monitor, Pen } from "lucide-react";
import { describe, expect, it } from "vite-plus/test";
import { MEDIUM_OPTIONS } from "#/lib/artmakers.ts";
import { getMediumGroup, MEDIUM_GROUPS, getMediumGroupForMedium } from "#/lib/mediums.ts";

describe("medium grouping", () => {
  it("assigns a medium to the first group whose keyword matches", () => {
    // "Acrylic" appears in the Painting group's keyword list.
    expect(getMediumGroupForMedium("Acrylic paint on a vinyl record").slug).toBe("painting");
    // "Digital" is a keyword of the Digital group, so digital editing counts
    // as digital work even when mixed with physical media.
    expect(getMediumGroupForMedium("Pen on paper + digital editing").slug).toBe("digital");
    // Photography and videography (including digital photography and film)
    // land in the dedicated Photography / Videography group.
    expect(getMediumGroupForMedium("Photography / Videography").slug).toBe(
      "photography-videography",
    );
    expect(getMediumGroupForMedium("Photography/Videography").slug).toBe("photography-videography");
    expect(getMediumGroupForMedium("Digital Photography").slug).toBe("photography-videography");
    expect(getMediumGroupForMedium("35mm Film").slug).toBe("photography-videography");
    expect(getMediumGroupForMedium("Videography").slug).toBe("photography-videography");
  });

  it("maps bare group labels to their own group", () => {
    expect(getMediumGroupForMedium("Painting").slug).toBe("painting");
    expect(getMediumGroupForMedium("Photography / Videography").slug).toBe(
      "photography-videography",
    );
    expect(getMediumGroupForMedium("Digital").slug).toBe("digital");
    expect(getMediumGroupForMedium("Clothing").slug).toBe("clothing");
    expect(getMediumGroupForMedium("Objects").slug).toBe("objects");
    expect(getMediumGroupForMedium("Drawing").slug).toBe("drawing");
    expect(getMediumGroupForMedium("Mixed Practice").slug).toBe("mixed-practice");
  });

  it("keeps MEDIUM_OPTIONS aligned with MEDIUM_GROUPS labels", () => {
    expect([...MEDIUM_OPTIONS]).toEqual(MEDIUM_GROUPS.map((group) => group.label));
  });

  it("is case-insensitive", () => {
    expect(getMediumGroupForMedium("CERAMICS").slug).toBe("objects");
    expect(getMediumGroupForMedium("crochet and amigurumi").slug).toBe("clothing");
    expect(getMediumGroupForMedium("PORTRAIT PHOTOGRAPHY").slug).toBe("photography-videography");
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

  it("assigns expected icons to medium groups", () => {
    expect(getMediumGroup("photography-videography")?.icon).toBe(Camera);
    expect(getMediumGroup("digital")?.icon).toBe(Monitor);
    expect(getMediumGroup("drawing")?.icon).toBe(Pen);
  });
});
