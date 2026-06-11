import { shouldReprocessImportedPost } from "@/app/workflows/wordpress-backfill-policy";

describe(shouldReprocessImportedPost, () => {
  it("reprocesses imported drafts and archived posts", () => {
    expect(shouldReprocessImportedPost("draft")).toBeTruthy();
    expect(shouldReprocessImportedPost("archived")).toBeTruthy();
  });

  it("skips AI rewriting for already-published imports", () => {
    expect(shouldReprocessImportedPost("published")).toBeFalsy();
  });

});
