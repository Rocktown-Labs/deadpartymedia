import { describe, expect, it } from "vite-plus/test";
import { decodeHtmlEntities, htmlText, sanitizeRichHtml } from "@dpmedia/contracts";
describe("native Worker HTML processing", () => {
  it("loads sanitizer and entity parser in workerd", () => {
    expect(sanitizeRichHtml("<p>Safe</p><script>alert(1)</script>")).toBe("<p>Safe</p>");
    expect(htmlText("<p>Music &amp; arts</p>")).toBe("Music & arts");
    expect(decodeHtmlEntities("&amp;lt;")).toBe("&lt;");
  });
});
