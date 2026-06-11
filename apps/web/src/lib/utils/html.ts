/**
 * Decodes HTML entities (both numeric and common named ones) back into plain text.
 */
export function decodeHtmlEntities(str: string): string {
  if (!str) {return "";}
  return str
    .replaceAll(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number.parseInt(dec, 10)))
    .replaceAll(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&apos;", "'")
    .replaceAll("&nbsp;", " ")
    .replaceAll("&ndash;", "–")
    .replaceAll("&mdash;", "—")
    .replaceAll("&rdquo;", "”")
    .replaceAll("&ldquo;", "“")
    .replaceAll("&rsquo;", "’")
    .replaceAll("&lsquo;", "‘");
}
