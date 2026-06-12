import { buildPostsApiPath } from "@/lib/api/articles";

describe(buildPostsApiPath, () => {
  it("returns the base posts endpoint when no category is provided", () => {
    expect(buildPostsApiPath()).toBe("/api/posts");
  });

  it("uRL-encodes category values with special characters", () => {
    expect(buildPostsApiPath("HIP-HOP & R&B")).toBe("/api/posts?category=HIP-HOP%20%26%20R%26B");
    expect(buildPostsApiPath("HARDCORE & ROCK")).toBe("/api/posts?category=HARDCORE%20%26%20ROCK");
  });

  it("adds feed limits without requiring a category", () => {
    expect(buildPostsApiPath(undefined, { limit: 12 })).toBe("/api/posts?limit=12");
  });

  it("combines category, limit, and offset parameters", () => {
    expect(buildPostsApiPath("COUNTRY", { limit: 9, offset: 3 })).toBe(
      "/api/posts?category=COUNTRY&limit=9&offset=3",
    );
  });
});
