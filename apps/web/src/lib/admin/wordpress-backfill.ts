import { decodeHtmlEntities } from "@/lib/utils/html";

interface AuthorOption {
  clerkId: string;
  name: string;
  role?: string;
}

interface ImportSourceLookupRow {
  postId: number;
  sourceUrl: string | null;
  title: string | null;
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

export function findMatchingImportSource(
  rows: ImportSourceLookupRow[],
  sourceUrl: string,
  title: string,
) {
  const exactMatch = rows.find((row) => row.sourceUrl === sourceUrl);
  if (exactMatch) {
    return exactMatch;
  }

  const normalizedUrl = normalizeImportSourceUrl(sourceUrl);
  const normalizedTitle = normalizeImportTitle(title);

  return rows.find(
    (row) =>
      normalizeImportSourceUrl(row.sourceUrl) === normalizedUrl ||
      normalizeImportTitle(row.title) === normalizedTitle,
  );
}

export function findDefaultBackfillAuthorId(authorOptions: AuthorOption[], fallbackAuthorId = "") {
  const pettyAuthor = authorOptions.find((option) => {
    const clerkId = normalizeLookupText(option.clerkId);
    const name = normalizeLookupText(option.name);
    return clerkId.includes("pettyvandalism") || name.includes("pettyvandalism");
  });

  return pettyAuthor?.clerkId || fallbackAuthorId;
}

export function parseNameParts(displayName: string): {
  firstName: string;
  lastName: string | null;
} {
  const words = displayName.trim().replaceAll(/\s+/g, " ").split(" ").filter(Boolean);
  if (words.length === 0) {
    return { firstName: "Dead Party", lastName: "Writer" };
  }
  if (words.length === 1) {
    return { firstName: words[0] ?? "Dead Party", lastName: null };
  }
  return {
    firstName: words[0] ?? "Dead Party",
    lastName: words.slice(1).join(" ") || null,
  };
}

export function findMatchingAuthorId(
  authorOptions: AuthorOption[],
  authorSlug: string | null | undefined,
  authorName: string | null | undefined,
  fallbackAuthorId = "",
) {
  const cleanSlug = authorSlug ? normalizeLookupText(authorSlug) : "";
  const cleanName = authorName ? normalizeLookupText(authorName) : "";

  if (!cleanSlug && !cleanName) {
    return fallbackAuthorId;
  }

  if (cleanSlug) {
    const matchedBySlug = authorOptions.find((option) => {
      const optionClerkId = normalizeLookupText(option.clerkId);
      const optionName = normalizeLookupText(option.name);
      return (
        optionClerkId === cleanSlug || optionClerkId.endsWith(cleanSlug) || optionName === cleanSlug
      );
    });
    if (matchedBySlug) {
      return matchedBySlug.clerkId;
    }
  }

  if (cleanName) {
    const matchedByName = authorOptions.find((option) => {
      const optionName = normalizeLookupText(option.name);
      return optionName === cleanName;
    });
    if (matchedByName) {
      return matchedByName.clerkId;
    }
  }

  return fallbackAuthorId;
}

export function shouldReprocessImportedPost(existingStatus: string) {
  return existingStatus !== "published";
}

export function sanitizeAndTruncateExcerpt(
  value: string | null | undefined,
  maxLength = 500,
): string {
  if (!value) {
    return "";
  }

  const clean = decodeHtmlEntities(value)
    .replaceAll(/<[^>]*>/g, " ")
    .replaceAll(/\s+/g, " ")
    .trim();

  if (clean.length <= maxLength) {
    return clean;
  }

  const targetLen = maxLength - 1;
  const cutoff = clean.slice(0, targetLen);
  const lastSpace = cutoff.lastIndexOf(" ");

  const truncated =
    lastSpace > targetLen - 40 ? cutoff.slice(0, lastSpace).trimEnd() : cutoff.trimEnd();

  return `${truncated}…`;
}
