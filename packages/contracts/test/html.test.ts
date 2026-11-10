import { describe, expect, it } from "vite-plus/test";
import { decodeHtmlEntities, htmlText, safeImageUrl, sanitizeRichHtml } from "../src/html";
describe("HTML and image boundaries", () => {
  it("decodes entities once", () => {
    expect(decodeHtmlEntities("&amp;lt;b&amp;gt; &#38;lt; &#x1F3A8;")).toBe("&lt;b&gt; &lt; 🎨");
  });
  it("strips tags for text without reinterpreting decoded text as markup", () => {
    expect(htmlText("<p>Hello &amp; world</p><script>alert(1)</script>")).toBe("Hello & world");
    expect(htmlText("&lt;img src=x onerror=alert(1)&gt;")).toBe("<img src=x onerror=alert(1)>");
  });
  it("preserves safe formatting and removes executable markup", () => {
    const html = sanitizeRichHtml(
      '<p>Product <strong>details</strong></p><img src="javascript:alert(1)" onerror="alert(1)"><script>alert(1)</script>',
    );
    expect(html).toContain("<strong>details</strong>");
    expect(html).not.toContain("javascript:");
    expect(html).not.toContain("onerror");
    expect(html).not.toContain("<script");
  });
  it("rejects executable and data image URLs", () => {
    expect(safeImageUrl("javascript:alert(1)")).toBe("");
    expect(safeImageUrl("data:image/svg+xml,<svg onload=alert(1)>")).toBe("");
    expect(safeImageUrl("/api/arts/media/painting.png")).toBe("/api/arts/media/painting.png");
    expect(safeImageUrl("https://media.example.test/image.png")).toBe(
      "https://media.example.test/image.png",
    );
  });
});
