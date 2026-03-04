export function normalizeInstagramInput(input: unknown): string {
  const raw = String(input ?? "").trim();
  if (!raw) {
    return "";
  }

  // Username-only UX: accept @handle, handle-only, or an instagram URL.
  // Return just the username; server-side schema will canonicalize to https://instagram.com/<username>.
  let candidate = raw.startsWith("@") ? raw.slice(1).trim() : raw;
  if (!candidate) {
    return "";
  }

  candidate = candidate.replace(/^(?:https?:\/\/)?(?:www\.|m\.)?instagram\.com\//i, "");

  candidate = candidate.replace(/^\/+/, "");
  candidate = (candidate.split(/[/?#]/)[0] ?? "").trim();

  return candidate;
}
