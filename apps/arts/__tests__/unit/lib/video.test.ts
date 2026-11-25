import { getDefaultVideoPosterUrl, isValidVideoUrl, parseVideoLink } from "#/lib/video.ts";
import { describe, expect, it } from "vite-plus/test";

describe("video link parsing", () => {
  it("validates http(s) video URLs and rejects unsafe schemes", () => {
    expect(isValidVideoUrl("https://youtu.be/dQw4w9WgXcQ")).toBe(true);
    expect(isValidVideoUrl("http://vimeo.com/123456789")).toBe(true);
    expect(isValidVideoUrl("javascript:alert(1)")).toBe(false);
    expect(isValidVideoUrl("data:text/html,<script>alert(1)</script>")).toBe(false);
    expect(isValidVideoUrl("not a url")).toBe(false);
    expect(isValidVideoUrl("")).toBe(false);
  });

  it("converts YouTube links into privacy-enhanced embeds", () => {
    const urls = [
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://youtu.be/dQw4w9WgXcQ",
      "https://youtube.com/shorts/dQw4w9WgXcQ",
      "https://m.youtube.com/live/dQw4w9WgXcQ?feature=share",
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    ];

    for (const url of urls) {
      expect(parseVideoLink(url)).toEqual({
        kind: "embed",
        playerSrc: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
        provider: "YouTube",
        watchUrl: url,
      });
    }
  });

  it("converts Vimeo links into embeds and preserves privacy hashes", () => {
    expect(parseVideoLink("https://vimeo.com/123456789")).toEqual({
      kind: "embed",
      playerSrc: "https://vimeo.com/123456789",
      provider: "Vimeo",
      watchUrl: "https://vimeo.com/123456789",
    });

    expect(parseVideoLink("https://vimeo.com/channels/staffpicks/123456789")).toEqual({
      kind: "embed",
      playerSrc: "https://vimeo.com/123456789",
      provider: "Vimeo",
      watchUrl: "https://vimeo.com/channels/staffpicks/123456789",
    });

    expect(parseVideoLink("https://vimeo.com/123456789/abcdef1234")).toEqual({
      kind: "embed",
      playerSrc: "https://vimeo.com/123456789?h=abcdef1234",
      provider: "Vimeo",
      watchUrl: "https://vimeo.com/123456789/abcdef1234",
    });

    expect(parseVideoLink("https://player.vimeo.com/video/123456789?h=abcdef1234")).toEqual({
      kind: "embed",
      playerSrc: "https://vimeo.com/123456789?h=abcdef1234",
      provider: "Vimeo",
      watchUrl: "https://player.vimeo.com/video/123456789?h=abcdef1234",
    });
  });

  it("plays direct video files inside the Video.js player", () => {
    expect(parseVideoLink("https://cdn.example.com/reel.mp4")).toEqual({
      kind: "embed",
      playerSrc: "https://cdn.example.com/reel.mp4",
      provider: "Video",
      watchUrl: "https://cdn.example.com/reel.mp4",
    });

    expect(parseVideoLink("https://cdn.example.com/clip.webm?token=abc")).toEqual({
      kind: "embed",
      playerSrc: "https://cdn.example.com/clip.webm?token=abc",
      provider: "Video",
      watchUrl: "https://cdn.example.com/clip.webm?token=abc",
    });
  });

  it("classifies Instagram, TikTok, and generic links as external watch links", () => {
    expect(parseVideoLink("https://www.instagram.com/reel/C1234567890/")).toEqual({
      kind: "external",
      provider: "Instagram",
      watchUrl: "https://www.instagram.com/reel/C1234567890/",
    });

    expect(parseVideoLink("https://www.tiktok.com/@deadparty/video/1234567890")).toEqual({
      kind: "external",
      provider: "TikTok",
      watchUrl: "https://www.tiktok.com/@deadparty/video/1234567890",
    });

    expect(parseVideoLink("https://artist.example/film")).toEqual({
      kind: "external",
      provider: "Video",
      watchUrl: "https://artist.example/film",
    });
  });

  it("returns null for empty or invalid URLs", () => {
    expect(parseVideoLink(null)).toBeNull();
    expect(parseVideoLink(undefined)).toBeNull();
    expect(parseVideoLink("   ")).toBeNull();
    expect(parseVideoLink("javascript:alert(1)")).toBeNull();
  });

  it("derives a default thumbnail poster URL for YouTube links", () => {
    expect(getDefaultVideoPosterUrl("https://youtu.be/dQw4w9WgXcQ")).toBe(
      "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
    );
    expect(getDefaultVideoPosterUrl("https://vimeo.com/123456789")).toBeNull();
    expect(getDefaultVideoPosterUrl("https://www.instagram.com/reel/C1234567890/")).toBeNull();
  });
});
