import {
  findMatchingImportSource,
  findDefaultBackfillAuthorId,
  findMatchingAuthorId,
  normalizeImportSourceUrl,
  normalizeImportTitle,
  parseNameParts,
  sanitizeAndTruncateExcerpt,
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

describe(findMatchingAuthorId, () => {
  const authorOptions = [
    { clerkId: "user_petty", name: "Petty Vandalism", role: "writer" },
    { clerkId: "wp_placeholder:caitlin", name: "Caitlin", role: "writer" },
    { clerkId: "user_skylar", name: "Skylar Stewart", role: "writer" },
  ];

  it("matches an author by authorSlug matching clerkId", () => {
    expect(findMatchingAuthorId(authorOptions, "caitlin", "Caitlin", "fallback")).toBe(
      "wp_placeholder:caitlin",
    );
  });

  it("matches an author by authorName matching user name", () => {
    expect(findMatchingAuthorId(authorOptions, "unknown-slug", "Skylar Stewart", "fallback")).toBe(
      "user_skylar",
    );
  });

  it("matches an author by authorSlug matching part of clerkId", () => {
    expect(findMatchingAuthorId(authorOptions, "skylar", "Skylar", "fallback")).toBe("user_skylar");
  });

  it("falls back to fallbackAuthorId when no matching writer exists in options", () => {
    expect(
      findMatchingAuthorId(authorOptions, "brand-new-author", "Brand New", "fallback-id"),
    ).toBe("fallback-id");
  });
});

describe(parseNameParts, () => {
  it("splits multi-word names into firstName and lastName", () => {
    expect(parseNameParts("John Doe")).toEqual({ firstName: "John", lastName: "Doe" });
    expect(parseNameParts("John Middle Doe")).toEqual({
      firstName: "John",
      lastName: "Middle Doe",
    });
  });

  it("handles single-word names", () => {
    expect(parseNameParts("Caitlin")).toEqual({ firstName: "Caitlin", lastName: null });
  });

  it("falls back for empty strings", () => {
    expect(parseNameParts("")).toEqual({ firstName: "Dead Party", lastName: "Writer" });
  });
});

describe(normalizeImportSourceUrl, () => {
  it("normalizes protocol, www, case, and trailing slashes", () => {
    expect(normalizeImportSourceUrl("HTTPS://www.DeadPartyMedia.com/article/test-post/")).toBe(
      "deadpartymedia.com/article/test-post",
    );
  });

  it("normalizes fallback URL-like strings", () => {
    expect(normalizeImportSourceUrl("https://www.example.com/path/")).toBe("example.com/path");
  });
});

describe(normalizeImportTitle, () => {
  it("normalizes titles for imported post fallback matching", () => {
    expect(normalizeImportTitle("“2001;” Growing up with Campocalyspe")).toBe(
      "2001growingupwithcampocalyspe",
    );
  });
});

describe(findMatchingImportSource, () => {
  const importRows = [
    {
      postId: 40,
      sourceUrl: "https://deadpartymedia.wordpress.com/2026/02/02/the-hours-devour-us/",
      title: "Learning to Let Go: Welcome to “The Hours Devour Us”",
    },
    {
      postId: 41,
      sourceUrl: "https://www.deadpartymedia.com/article/2001-growing-up-with-campocalyspe/",
      title: "“2001;” Growing up with Campocalyspe",
    },
  ];

  it("prefers exact source URL matches", () => {
    expect(
      findMatchingImportSource(
        importRows,
        "https://deadpartymedia.wordpress.com/2026/02/02/the-hours-devour-us/",
        "Different Title",
      )?.postId,
    ).toBe(40);
  });

  it("matches older source URL variants after normalization", () => {
    expect(
      findMatchingImportSource(
        importRows,
        "https://deadpartymedia.com/article/2001-growing-up-with-campocalyspe",
        "Different Title",
      )?.postId,
    ).toBe(41);
  });

  it("falls back to normalized titles when URLs differ", () => {
    expect(
      findMatchingImportSource(
        importRows,
        "https://public-api.wordpress.com/rest/unrelated",
        '"2001" Growing up with Campocalyspe',
      )?.postId,
    ).toBe(41);
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

describe(sanitizeAndTruncateExcerpt, () => {
  it("returns empty string for falsy values", () => {
    expect(sanitizeAndTruncateExcerpt("")).toBe("");
    expect(sanitizeAndTruncateExcerpt(null)).toBe("");
    expect(sanitizeAndTruncateExcerpt(undefined)).toBe("");
  });

  it("strips HTML tags, decodes entities, and collapses whitespace", () => {
    const input =
      "<p>This is an <strong>exciting</strong> &amp; fresh &quot;track&quot; from Arkansas.&nbsp;&nbsp;\n\nCheck it out!</p>";
    expect(sanitizeAndTruncateExcerpt(input)).toBe(
      'This is an exciting & fresh "track" from Arkansas. Check it out!',
    );
  });

  it("preserves text that is within the maxLength limit", () => {
    const text = "A concise 2-sentence summary of an indie concert.";
    expect(sanitizeAndTruncateExcerpt(text, 500)).toBe(text);
  });

  it("truncates text exceeding 500 characters so that total length is <= 500 and ends with ellipsis", () => {
    const longText =
      "Dead Party Media showcases the underground music and arts scene across Arkansas and beyond. " +
      "From underground hardcore basement gigs in Little Rock to synth-driven electronic dance music festivals in Northwest Arkansas, " +
      "we cover independent artists creating original sounds and pushing cultural boundaries. " +
      "Our team provides candid reviews, in-depth interviews, photography, and community highlights to amplify voices that traditional media often ignores. " +
      "Stay connected with the latest local album releases, tour announcements, venue profiles, and exclusive editorial features updated weekly.";

    expect(longText.length).toBeGreaterThan(500);

    const result = sanitizeAndTruncateExcerpt(longText, 500);
    expect(result.length).toBeLessThanOrEqual(500);
    expect(result.endsWith("…")).toBeTruthy();
    // Verify it didn't cut off with awkward spacing before ellipsis
    expect(result.endsWith(" …")).toBeFalsy();
  });

  it("supports custom maxLength limits with word boundary preservation", () => {
    const input = "The quick brown fox jumps over the lazy dog repeatedly.";
    const result = sanitizeAndTruncateExcerpt(input, 25);
    expect(result.length).toBeLessThanOrEqual(25);
    expect(result.endsWith("…")).toBeTruthy();
    expect(result).toBe("The quick brown fox…");
  });
});
