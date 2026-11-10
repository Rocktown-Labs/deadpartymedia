export function generateSlug(title: string): string {
  const normalized = title
    .toLowerCase()
    .trim()
    // Remove special characters
    .replaceAll(/[^\w\s-]/g, "")
    // Replace spaces and underscores with hyphens
    .replaceAll(/[\s_-]+/g, "-");

  // Trim hyphens with bounded scans instead of a backtracking-prone regex.
  let start = 0;
  while (start < normalized.length && normalized[start] === "-") {
    start += 1;
  }

  let end = normalized.length;
  while (end > start && normalized[end - 1] === "-") {
    end -= 1;
  }

  return normalized.slice(start, end);
}
