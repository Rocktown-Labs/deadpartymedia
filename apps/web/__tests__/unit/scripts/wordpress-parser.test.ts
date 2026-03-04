import {
  extractPermalinkDate,
  extractPermalinkSlug,
  isWordpressPostPermalink,
  mapWordpressCategory,
  normalizeAuthorSlug,
  parseWordpressArticle,
} from "../../../scripts/lib/wordpress-parser";

const SAMPLE_HTML = `
<!DOCTYPE html>
<html>
  <body>
    <h1 class="wp-block-post-title">Sample Post Title</h1>
    <figure class="wp-block-post-featured-image">
      <img src="https://deadpartymedia.wordpress.com/wp-content/uploads/2026/02/cover.jpg" />
    </figure>
    <div class="entry-content">
      <p>First paragraph in the article body.</p>
      <p><img src="/wp-content/uploads/2026/02/inline.png" /></p>
      <div id="jp-post-flair">remove me</div>
    </div>
    <div class="wp-block-post-date">
      <time datetime="2026-02-02T18:14:28-06:00">February 2, 2026</time>
    </div>
    <div class="wp-block-post-author">
      <p class="wp-block-post-author__name">pettyvandalism</p>
    </div>
    <div class="taxonomy-category">
      <a href="/category/country/">Country</a>
      <a href="/category/indie/">indie</a>
    </div>
  </body>
</html>
`;

describe("wordpress-parser", () => {
  it("parses a WordPress post into import-ready shape", () => {
    const parsed = parseWordpressArticle({
      html: SAMPLE_HTML,
      metadata: {
        "article:modified_time": "2026-02-11T14:28:09+00:00",
        "article:published_time": "2026-02-03T00:14:28+00:00",
        description: "Metadata excerpt from WordPress",
      },
      sourceUrl:
        "https://deadpartymedia.wordpress.com/2026/02/02/learning-to-let-go-welcome-to-the-hours-devour-us/",
    });

    expect(parsed.slug).toBe("learning-to-let-go-welcome-to-the-hours-devour-us");
    expect(parsed.title).toBe("Sample Post Title");
    expect(parsed.excerpt).toBe("Metadata excerpt from WordPress");
    expect(parsed.coverImageUrl).toContain("cover.jpg");
    expect(parsed.inlineImageUrls).toContain(
      "https://deadpartymedia.wordpress.com/wp-content/uploads/2026/02/inline.png",
    );
    expect(parsed.contentHtml).not.toContain("jp-post-flair");
    expect(parsed.authorSlug).toBe("pettyvandalism");
    expect(parsed.category).toBe("COUNTRY");
    expect(parsed.rawCategories).toStrictEqual(["Country", "indie"]);
    expect(parsed.sourcePublishedAt.toISOString()).toBe("2026-02-03T00:14:28.000Z");
    expect(parsed.sourceModifiedAt?.toISOString()).toBe("2026-02-11T14:28:09.000Z");
  });

  it("maps categories using the first known supported category", () => {
    expect(mapWordpressCategory(["indie", "Hip-Hop & R&B"])).toBe("HIP-HOP & R&B");
    expect(mapWordpressCategory(["noise", "experimental"])).toBe("OTHER");
  });

  it("validates permalink format and extracts permalink metadata", () => {
    const url =
      "https://deadpartymedia.wordpress.com/2025/10/22/faucette-festivals-mixing-family-fun-with-edm/";

    expect(isWordpressPostPermalink(url)).toBeTruthy();
    expect(extractPermalinkSlug(url)).toBe("faucette-festivals-mixing-family-fun-with-edm");
    expect(extractPermalinkDate(url)?.toISOString()).toBe("2025-10-22T00:00:00.000Z");
    expect(normalizeAuthorSlug("J.L. Jones")).toBe("jl-jones");
  });
});
