import { describe, expect, it } from "vite-plus/test";
import { createSeoMeta, getAbsoluteUrl } from "#/lib/seo.ts";

describe("createSeoMeta", () => {
  it("should generate title tag and meta description", () => {
    const meta = createSeoMeta({
      description: "Discover Arkansas visual culture on Dead Party Arts.",
      path: "/artmakers",
      title: "Artmakers",
    });

    expect(meta.meta[0]).toEqual({ title: "Artmakers | Dead Party Arts" });
    expect(meta.meta).toEqual(
      expect.arrayContaining([
        { name: "description", content: "Discover Arkansas visual culture on Dead Party Arts." },
      ]),
    );
  });

  it("should append site title suffix unless title matches siteName", () => {
    const metaWithoutSuffix = createSeoMeta({
      description: "Homepage of Dead Party Arts.",
      path: "/",
      title: "Dead Party Arts",
    });

    expect(metaWithoutSuffix.meta[0]).toEqual({ title: "Dead Party Arts" });
  });

  it("should format absolute URLs correctly", () => {
    expect(getAbsoluteUrl("/merch")).toBe("https://arts.deadpartymedia.com/merch");
  });
});
