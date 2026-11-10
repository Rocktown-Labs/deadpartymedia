import { decodeHTML } from "entities";
import filterXSS from "xss";

/** Sanitize provider/editor HTML before inserting it into a document. */
export function sanitizeRichHtml(value: string | null | undefined) {
  return filterXSS(value || "", { stripIgnoreTag: true, stripIgnoreTagBody: ["script", "style"] });
}
/** Return plain text. React must render this result as text, never as HTML. */
export function htmlText(value: string | null | undefined) {
  return decodeHTML(
    filterXSS(value || "", {
      whiteList: {},
      stripIgnoreTag: true,
      stripIgnoreTagBody: ["script", "style"],
    }),
  ).trim();
}
/** Decode once, including numeric entities, without recursively decoding the result. */
export function decodeHtmlEntities(value: string) {
  return decodeHTML(value || "");
}
/** Image previews accept HTTP(S) and same-origin paths, never executable/data URLs. */
export function safeImageUrl(value: string | null | undefined): string {
  if (!value) return "";
  try {
    const url = new URL(value, "https://relative.invalid");
    if (url.protocol !== "https:" && url.protocol !== "http:") return "";
    const normalized =
      url.origin === "https://relative.invalid"
        ? `${url.pathname}${url.search}${url.hash}`
        : url.href;
    // Percent-encode HTML delimiters without double-encoding existing URL escapes
    // or changing query separators. React receives a URL, not HTML entities.
    return normalized.replace(/[<>"'`]/g, (character) => encodeURIComponent(character));
  } catch {
    return "";
  }
}
