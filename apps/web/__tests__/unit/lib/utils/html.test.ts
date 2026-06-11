
import { decodeHtmlEntities } from "@/lib/utils/html";

describe(decodeHtmlEntities, () => {
  it("should return empty string if input is empty", () => {
    expect(decodeHtmlEntities("")).toBe("");
  });

  it("should decode numeric entities correctly", () => {
    expect(decodeHtmlEntities("This is &#8220;Spazz Code&#8221; by Yet")).toBe(
      "This is “Spazz Code” by Yet",
    );
    expect(decodeHtmlEntities("A Mess that is more Consistent than You&#8217;d Think")).toBe(
      "A Mess that is more Consistent than You’d Think",
    );
  });

  it("should decode named entities correctly", () => {
    expect(decodeHtmlEntities("Tom &amp; Jerry")).toBe("Tom & Jerry");
    expect(decodeHtmlEntities("&ldquo;Hello World&rdquo;")).toBe("“Hello World”");
    expect(decodeHtmlEntities("It&rsquo;s fine")).toBe("It’s fine");
  });

  it("should ignore unknown entities or pass through", () => {
    expect(decodeHtmlEntities("No entities here")).toBe("No entities here");
    expect(decodeHtmlEntities("An unknown entity &foo;")).toBe("An unknown entity &foo;");
  });
});
