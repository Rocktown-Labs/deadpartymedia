interface AuthorOption {
  clerkId: string;
  name: string;
  role?: string;
}

function normalizeLookupText(value: string) {
  return value.toLowerCase().replaceAll(/[^a-z0-9]/g, "");
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
