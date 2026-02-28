type JsonObject = Record<string, unknown>;

export type NormalizedPostContentKind =
  | "tiptap_json"
  | "nested_tiptap_json"
  | "stringified_tiptap_json"
  | "html_or_text";

export type NormalizedPostContent = {
  kind: NormalizedPostContentKind;
  editorValue: JsonObject | string;
  tiptapDoc: JsonObject | null;
  canonicalStorage: string;
  changed: boolean;
};

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isTipTapDoc(value: unknown): value is JsonObject {
  if (!isObject(value)) return false;
  if (value.type !== "doc") return false;
  return Array.isArray(value.content);
}

function parseJson(input: string): unknown | null {
  try {
    return JSON.parse(input);
  } catch {
    return null;
  }
}

function maybeUnwrapNestedTipTapDoc(value: unknown): JsonObject | null {
  if (!isTipTapDoc(value)) return null;

  const content = value.content;
  if (!Array.isArray(content) || content.length !== 1) return null;

  const firstNode = content[0];
  if (!isObject(firstNode) || firstNode.type !== "paragraph") return null;
  if (!Array.isArray(firstNode.content) || firstNode.content.length !== 1) return null;

  const textNode = firstNode.content[0];
  if (!isObject(textNode) || textNode.type !== "text") return null;

  const nestedText = textNode.text;
  if (typeof nestedText !== "string" || nestedText.trim().length === 0) return null;

  const nestedParsed = parseJson(nestedText);
  if (!isTipTapDoc(nestedParsed)) return null;

  return nestedParsed;
}

export function normalizeStoredPostContent(rawContent: string): NormalizedPostContent {
  const raw = rawContent ?? "";
  const firstParsed = parseJson(raw);

  if (isTipTapDoc(firstParsed)) {
    const nested = maybeUnwrapNestedTipTapDoc(firstParsed);
    if (nested) {
      const canonicalStorage = JSON.stringify(nested);
      return {
        kind: "nested_tiptap_json",
        editorValue: nested,
        tiptapDoc: nested,
        canonicalStorage,
        changed: canonicalStorage !== raw,
      };
    }

    const canonicalStorage = JSON.stringify(firstParsed);
    return {
      kind: "tiptap_json",
      editorValue: firstParsed,
      tiptapDoc: firstParsed,
      canonicalStorage,
      changed: canonicalStorage !== raw,
    };
  }

  if (typeof firstParsed === "string") {
    const secondParsed = parseJson(firstParsed);
    if (isTipTapDoc(secondParsed)) {
      const nested = maybeUnwrapNestedTipTapDoc(secondParsed);
      const resolved = nested ?? secondParsed;
      const canonicalStorage = JSON.stringify(resolved);
      return {
        kind: "stringified_tiptap_json",
        editorValue: resolved,
        tiptapDoc: resolved,
        canonicalStorage,
        changed: canonicalStorage !== raw,
      };
    }
  }

  return {
    kind: "html_or_text",
    editorValue: raw,
    tiptapDoc: null,
    canonicalStorage: raw,
    changed: false,
  };
}
