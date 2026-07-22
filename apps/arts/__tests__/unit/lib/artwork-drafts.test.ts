import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import {
  createArtworkDrafts,
  getUploadedObjectKey,
  titleFromFileName,
} from "#/lib/artwork-drafts.ts";

describe("artwork draft helpers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should create readable titles from uploaded filenames", () => {
    expect(titleFromFileName("electric-blue-study.jpg")).toBe("Electric Blue Study");
    expect(titleFromFileName("window_painting_final.webp")).toBe("Window Painting Final");
  });

  it("should read object keys from supported upload response shapes", () => {
    expect(getUploadedObjectKey({ objectInfo: { key: "artworks/object-info.png" } })).toBe(
      "artworks/object-info.png",
    );
    expect(getUploadedObjectKey({ uploadedObject: { key: "artworks/uploaded-object.png" } })).toBe(
      "artworks/uploaded-object.png",
    );
    expect(getUploadedObjectKey({ key: "artworks/top-level.png" })).toBe("artworks/top-level.png");
  });

  it("should build artwork drafts and skip uploads without object keys", () => {
    vi.spyOn(crypto, "randomUUID")
      .mockReturnValueOnce("00000000-0000-4000-8000-000000000001")
      .mockReturnValueOnce("00000000-0000-4000-8000-000000000002");

    const drafts = createArtworkDrafts([
      {
        file: { name: "ceramic-vessel.png" },
        objectInfo: { key: "artworks/ceramic-vessel.png" },
      },
      {
        file: { name: "missing-key.png" },
      },
      {
        uploadedObject: { key: "artworks/fallback-name.png" },
      },
    ]);

    expect(drafts).toEqual([
      {
        description: "",
        fileName: "ceramic-vessel.png",
        forSale: false,
        id: "00000000-0000-4000-8000-000000000001",
        imageKey: "artworks/ceramic-vessel.png",
        medium: "",
        price: "",
        status: "published",
        title: "Ceramic Vessel",
        year: "",
      },
      {
        description: "",
        fileName: "Artwork 3",
        forSale: false,
        id: "00000000-0000-4000-8000-000000000002",
        imageKey: "artworks/fallback-name.png",
        medium: "",
        price: "",
        status: "published",
        title: "Artwork 3",
        year: "",
      },
    ]);
  });
});
