interface AuthorOption {
  clerkId: string;
  name: string;
  role?: string;
}

function normalizeLookupText(value: string) {
  return value.toLowerCase().replaceAll(/[^a-z0-9]/g, "");
}

export function normalizeImportSourceUrl(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  try {
    const url = new URL(value);
    return `${url.hostname.replace(/^www\./, "")}${url.pathname}`.toLowerCase().replace(/\/+$/, "");
  } catch {
    return value
      .toLowerCase()
      .trim()
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/+$/, "");
  }
}

export function normalizeImportTitle(value: string | null | undefined) {
  return normalizeLookupText(value ?? "");
}

export function findDefaultBackfillAuthorId(authorOptions: AuthorOption[], fallbackAuthorId = "") {
  const pettyAuthor = authorOptions.find((option) => {
    const clerkId = normalizeLookupText(option.clerkId);
    const name = normalizeLookupText(option.name);
    return clerkId.includes("pettyvandalism") || name.includes("pettyvandalism");
  });

  return pettyAuthor?.clerkId || fallbackAuthorId;
}

export function shouldReprocessImportedPost(existingStatus: string) {
  return existingStatus !== "published";
}
