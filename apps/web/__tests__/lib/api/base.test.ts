import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { isExternalApi, resolveApiPath } from "@/lib/api/base";

describe("lib/api/base (Phase 1 flip)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("keeps relative paths when NEXT_PUBLIC_API_URL is unset (default — zero behavior change)", () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "");
    expect(isExternalApi()).toBe(false);
    expect(resolveApiPath("/api/posts")).toBe("/api/posts");
    expect(resolveApiPath("/api/artists/me")).toBe("/api/artists/me");
  });

  it("remaps /api paths to the external worker when NEXT_PUBLIC_API_URL is set", () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.deadpartymedia.com");
    expect(isExternalApi()).toBe(true);
    expect(resolveApiPath("/api/posts")).toBe("https://api.deadpartymedia.com/music/posts");
    expect(resolveApiPath("/api/articles/slug/comments")).toBe(
      "https://api.deadpartymedia.com/music/articles/slug/comments",
    );
  });

  it("normalizes trailing slashes in the base URL", () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:8787/");
    expect(resolveApiPath("/api/venues")).toBe("http://localhost:8787/music/venues");
  });

  it("remaps the renamed music-releases resource", () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:8787");
    expect(resolveApiPath("/api/music")).toBe("http://localhost:8787/music/releases");
    expect(resolveApiPath("/api/music?limit=10")).toBe(
      "http://localhost:8787/music/releases?limit=10",
    );
    expect(resolveApiPath("/api/music/some-slug")).toBe(
      "http://localhost:8787/music/releases/some-slug",
    );
  });

  it("leaves non-/api paths untouched", () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:8787");
    expect(resolveApiPath("/about")).toBe("/about");
    expect(resolveApiPath("https://elsewhere.example.com/feed")).toBe(
      "https://elsewhere.example.com/feed",
    );
  });
});
