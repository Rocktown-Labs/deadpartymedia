import { decodeHTML } from "entities";
import { FilterXSS } from "xss";

const rich = new FilterXSS({ stripIgnoreTag: true, stripIgnoreTagBody: ["script", "style"] });
const text = new FilterXSS({
  whiteList: {},
  stripIgnoreTag: true,
  stripIgnoreTagBody: ["script", "style"],
});
/** Sanitize provider/editor HTML before inserting it into a document. */
export function sanitizeRichHtml(value: string | null | undefined) {
  return rich.process(value || "");
}
/** Return plain text. React must render this result as text, never as HTML. */
export function htmlText(value: string | null | undefined) {
  return decodeHTML(text.process(value || "")).trim();
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
    return value;
  } catch {
    return "";
  }
}
