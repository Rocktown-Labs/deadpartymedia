const SLUG_SAFE_PATTERN = /[^a-z0-9]+/g;
const TRIM_DASH_PATTERN = /^-+|-+$/g;

export function createSlug(value: string) {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(SLUG_SAFE_PATTERN, "-")
    .replace(TRIM_DASH_PATTERN, "");

  return slug || "artmaker";
}
