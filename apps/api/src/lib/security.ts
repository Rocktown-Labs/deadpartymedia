/**
 * Ported from apps/web/src/lib/security.ts (framework-free).
 * Keep dependency-free so all routers can import it.
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

export function escapeJsonLd(json: string): string {
  return json.replaceAll("<", "\\u003c").replaceAll(">", "\\u003e").replaceAll("&", "\\u0026");
}

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

export function safeHttpUrl(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  return isSafeHttpUrl(trimmed) ? trimmed : null;
}

export function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = typeof value === "string" ? Number.parseInt(value, 10) : Number(value ?? fallback);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.trunc(parsed)));
}

export function truncateText(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }
  return value.slice(0, maxLength);
}
