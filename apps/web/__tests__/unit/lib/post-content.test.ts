import { describe, expect, it } from "vitest";
import { normalizeStoredPostContent } from "@/lib/content/post-content";

describe("post-content normalization", () => {
  it("returns tiptap docs as editor JSON", () => {
    const content = JSON.stringify({
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "Hello" }] }],
    });

    const normalized = normalizeStoredPostContent(content);

    expect(normalized.kind).toBe("tiptap_json");
    expect(normalized.tiptapDoc).not.toBeNull();
    expect(typeof normalized.editorValue).toBe("object");
    expect(normalized.changed).toBe(false);
  });

  it("unwraps nested tiptap docs embedded as escaped text", () => {
    const nested = JSON.stringify({
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "Nested" }] }],
    });

    const content = JSON.stringify({
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: nested }] }],
    });

    const normalized = normalizeStoredPostContent(content);

    expect(normalized.kind).toBe("nested_tiptap_json");
    expect(normalized.tiptapDoc).not.toBeNull();
    expect(normalized.changed).toBe(true);
  });

  it("unwraps JSON-stringified tiptap docs", () => {
    const tiptap = JSON.stringify({
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "Stringified" }] }],
    });
    const doubleStringified = JSON.stringify(tiptap);

    const normalized = normalizeStoredPostContent(doubleStringified);

    expect(normalized.kind).toBe("stringified_tiptap_json");
    expect(normalized.tiptapDoc).not.toBeNull();
    expect(normalized.changed).toBe(true);
  });

  it("keeps html content as plain string", () => {
    const html = "<p>Already HTML</p>";

    const normalized = normalizeStoredPostContent(html);

    expect(normalized.kind).toBe("html_or_text");
    expect(normalized.tiptapDoc).toBeNull();
    expect(normalized.editorValue).toBe(html);
    expect(normalized.changed).toBe(false);
  });
});
