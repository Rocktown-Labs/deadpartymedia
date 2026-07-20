import { describe, expect, it } from "vite-plus/test";
import { stripHtml } from "#/lib/utils.ts";

describe("stripHtml", () => {
  it("should return empty string when input is empty or null", () => {
    expect(stripHtml("")).toBe("");
  });

  it("should strip simple HTML tags like <p> and <i>", () => {
    const raw = "<p>The home of <i>Arkansas</i> Media</p>";
    expect(stripHtml(raw)).toBe("The home of Arkansas Media");
  });

  it("should decode HTML entities properly", () => {
    const raw = "<p>Dead &amp; Party Arts &nbsp;&quot;Quotes&quot; &amp; &#39;Single&#39;</p>";
    expect(stripHtml(raw)).toBe("Dead & Party Arts \"Quotes\" & 'Single'");
  });

  it("should normalize extra whitespace", () => {
    const raw = "<p> Line 1 </p>   <div>   Line 2 </div> ";
    expect(stripHtml(raw)).toBe("Line 1 Line 2");
  });
});
