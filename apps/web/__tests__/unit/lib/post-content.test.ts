import { normalizeStoredPostContent } from "@/lib/content/post-content";

describe("post-content normalization", () => {
  it("returns tiptap docs as editor JSON", () => {
    const content = JSON.stringify({
      content: [{ content: [{ text: "Hello", type: "text" }], type: "paragraph" }],
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
      content: [{ content: [{ text: "Nested", type: "text" }], type: "paragraph" }],
      type: "doc",
    });

    const content = JSON.stringify({
      content: [{ content: [{ text: nested, type: "text" }], type: "paragraph" }],
      type: "doc",
    });

    const normalized = normalizeStoredPostContent(content);

    expect(normalized.kind).toBe("nested_tiptap_json");
    expect(normalized.tiptapDoc).not.toBeNull();
    expect(normalized.changed).toBeTruthy();
  });

  it("unwraps JSON-stringified tiptap docs", () => {
    const tiptap = JSON.stringify({
      content: [{ content: [{ text: "Stringified", type: "text" }], type: "paragraph" }],
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
