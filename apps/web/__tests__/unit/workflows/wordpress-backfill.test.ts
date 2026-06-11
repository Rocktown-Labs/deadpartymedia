import {
  findDefaultBackfillAuthorId,
  shouldReprocessImportedPost,
} from "@/lib/admin/wordpress-backfill";

describe(shouldReprocessImportedPost, () => {
  it("reprocesses imported drafts and archived posts", () => {
    expect(shouldReprocessImportedPost("draft")).toBeTruthy();
    expect(shouldReprocessImportedPost("archived")).toBeTruthy();
  });

  it("skips AI rewriting for already-published imports", () => {
    expect(shouldReprocessImportedPost("published")).toBeFalsy();
  });
});

describe(findDefaultBackfillAuthorId, () => {
  it("matches Petty Vandalism even when the profile name has spacing", () => {
    expect(
      findDefaultBackfillAuthorId(
        [
          { clerkId: "user_writer", name: "Other Writer", role: "writer" },
          { clerkId: "user_petty", name: "Petty Vandalism", role: "writer" },
        ],
        "fallback",
      ),
    ).toBe("user_petty");
  });

  it("falls back when pettyvandalism is not present", () => {
    expect(
      findDefaultBackfillAuthorId(
        [{ clerkId: "user_writer", name: "Other Writer", role: "writer" }],
        "fallback",
      ),
    ).toBe("fallback");
  });
});
