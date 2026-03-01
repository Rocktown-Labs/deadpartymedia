
import { normalizeStoredPostContent } from "@/lib/content/post-content";

describe("post-content normalization", () => {
  it("returns tiptap docs as editor JSON", () => {
    const content = JSON.stringify({
      content: [{ type: "paragraph", content: [{ type: "text", text: "Hello" }] }],
      type: "doc",
    });

    const normalized = normalizeStoredPostContent(content);

    expect(normalized.kind).toBe("tiptap_json");
    expect(normalized.tiptapDoc).not.toBeNull();
    expectTypeOf(normalized.editorValue).toBeObject();
    expect(normalized.changed).toBeFalsy();
  });

  it("unwraps nested tiptap docs embedded as escaped text", () => {
    const nested = JSON.stringify({
      content: [{ type: "paragraph", content: [{ type: "text", text: "Nested" }] }],
      type: "doc",
    });

    const content = JSON.stringify({
      content: [{ type: "paragraph", content: [{ type: "text", text: nested }] }],
      type: "doc",
    });

    const normalized = normalizeStoredPostContent(content);

    expect(normalized.kind).toBe("nested_tiptap_json");
    expect(normalized.tiptapDoc).not.toBeNull();
    expect(normalized.changed).toBeTruthy();
  });

  it("unwraps JSON-stringified tiptap docs", () => {
    const tiptap = JSON.stringify({
      content: [{ type: "paragraph", content: [{ type: "text", text: "Stringified" }] }],
      type: "doc",
    });
    const doubleStringified = JSON.stringify(tiptap);

    const normalized = normalizeStoredPostContent(doubleStringified);

    expect(normalized.kind).toBe("stringified_tiptap_json");
    expect(normalized.tiptapDoc).not.toBeNull();
    expect(normalized.changed).toBeTruthy();
  });

  it("keeps html content as plain string", () => {
    const html = "<p>Already HTML</p>";

    const normalized = normalizeStoredPostContent(html);

    expect(normalized.kind).toBe("html_or_text");
    expect(normalized.tiptapDoc).toBeNull();
    expect(normalized.editorValue).toBe(html);
    expect(normalized.changed).toBeFalsy();
  });
});
