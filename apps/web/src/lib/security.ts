/**
 * Shared server/client-safe security helpers.
 * Keep dependency-free so API routes, server actions, and client components
 * can all import from here without pulling in DOM libraries.
 */

/**
 * Escape text for interpolation into HTML email bodies or other HTML strings.
 */
export function escapeHtml(value: string | null | undefined): string {
  const input = value ?? "";
  return input.replaceAll(/[&<>"']/g, (char) => {
    switch (char) {
      case "&": {
        return "&amp;";
      }
      case "<": {
        return "&lt;";
      }
      case ">": {
        return "&gt;";
      }
      case '"': {
        return "&quot;";
      }
      case "'": {
        return "&#39;";
      }
      default: {
        return char;
      }
    }
  });
}

/**
 * Escape a JSON string embedded inside <script type="application/ld+json">.
 * JSON.stringify does not escape `</script>`, which allows breakout.
 */
export function escapeJsonLd(json: string): string {
  return json.replaceAll("<", "\\u003c").replaceAll(">", "\\u003e").replaceAll("&", "\\u0026");
}

/**
 * Allow only http(s) URLs. Rejects javascript:, data:, vbscript:, and
 * protocol-relative / relative URLs that could be abused in href/src contexts.
 */
export function isSafeHttpUrl(value: string | null | undefined): boolean {
  if (!value) {
    return false;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > 2048) {
    return false;
  }
  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Return the URL if safe, otherwise null. Use before persisting or rendering hrefs.
 */
export function safeHttpUrl(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  return isSafeHttpUrl(trimmed) ? trimmed : null;
}

/**
 * Clamp a parsed pagination param into a safe range.
 */
export function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = typeof value === "string" ? Number.parseInt(value, 10) : Number(value ?? fallback);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.trunc(parsed)));
}

/**
 * Truncate user-controlled text before storage/render to bound DB and DOM cost.
 */
export function truncateText(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }
  return value.slice(0, maxLength);
}
