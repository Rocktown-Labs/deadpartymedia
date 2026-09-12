import { describe, it, expect } from "vite-plus/test";
import { musicReleaseSchema } from "@/lib/validations/music";

describe("musicReleaseSchema", () => {
  it("validates a valid release form payload", () => {
    const validData = {
      artistName: "The Silver Tears",
      bandcampUrl: "https://thesilvertears.bandcamp.com/album/telepathic-high",
      content: "Detailed review and track breakdown.",
      coverArt: "https://example.com/cover.jpg",
      excerpt: "A hauntingly beautiful indie rock LP.",
      featured: true,
      genre: "HARDCORE & ROCK",
      releaseDate: "2024-05-18",
      releaseType: "Album",
      spotifyUrl: "https://open.spotify.com/album/12345",
      status: "published",
      title: "Telepathic High",
    };

    const parsed = musicReleaseSchema.parse(validData);
    expect(parsed.title).toBe("Telepathic High");
    expect(parsed.releaseType).toBe("Album");
    expect(parsed.genre).toBe("HARDCORE & ROCK");
    expect(parsed.featured).toBe(true);
  });

  it("fails when title or artistName is missing", () => {
    const invalidData = {
      artistName: "",
      excerpt: "Short excerpt",
      genre: "EDM",
      releaseType: "Single",
      status: "published",
      title: "",
    };

    const result = musicReleaseSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    const messages = !result.success ? result.error.issues.map((i) => i.message) : [];
    expect(messages).toContain("Title is required");
    expect(messages).toContain("Artist name is required");
  });

  it("fails on invalid URL", () => {
    const invalidData = {
      artistName: "Artist",
      excerpt: "Valid excerpt",
      genre: "COUNTRY",
      releaseType: "Single",
      spotifyUrl: "not-a-url",
      status: "draft",
      title: "Valid Title",
    };

    const result = musicReleaseSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});
