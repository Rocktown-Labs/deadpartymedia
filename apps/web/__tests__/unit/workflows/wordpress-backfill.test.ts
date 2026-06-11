import {
  findDefaultBackfillAuthorId,
  shouldReprocessImportedPost,
} from "@/lib/admin/wordpress-backfill";
import { selectPrimarySubjectArtists } from "@/lib/admin/article-subject-artists";
import { getImportedEventStatus, isPastEventDate } from "@/lib/admin/event-flyer-import";

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

describe(selectPrimarySubjectArtists, () => {
  it("keeps the artist named in the title and drops inspiration references", () => {
    const artists = selectPrimarySubjectArtists(
      '"2001;" Growing up with Campocalyspe',
      `
        <p>Debut Mixtape "2001" by Campocalyspe.</p>
        <p>If you listen to the rapper JID, you will definitely be entranced by these songs.</p>
        <p>Slick, the main producer of this mixtape, takes the song into his own hands.</p>
        <p>You can keep up with new posts and releases from Campocalyspe by following his Instagram.</p>
      `,
      [{ name: "Campocalyspe" }, { name: "JID" }, { name: "Slick" }],
    );

    expect(artists).toStrictEqual([{ name: "Campocalyspe" }]);
  });

  it("falls back to intro/outro subject mentions when the title does not include a candidate", () => {
    const artists = selectPrimarySubjectArtists(
      "A debut mixtape finds its voice",
      `
        <p>Campocalyspe opens the project with a sharp sense of place.</p>
        <p>If you listen to JID, you may like the first two songs.</p>
        <p>Follow Campocalyspe for new releases.</p>
      `,
      [{ name: "JID" }, { name: "Campocalyspe" }],
    );

    expect(artists).toStrictEqual([{ name: "Campocalyspe" }]);
  });
});

describe("event flyer import publication rules", () => {
  it("publishes valid imported event dates, including past dates", () => {
    expect(getImportedEventStatus("2025-01-15")).toBe("published");
    expect(isPastEventDate("2025-01-15", new Date("2026-06-11T12:00:00"))).toBeTruthy();
  });

  it("keeps invalid imported dates as drafts", () => {
    expect(getImportedEventStatus("not-a-date")).toBe("draft");
    expect(isPastEventDate("not-a-date")).toBeFalsy();
  });
});
