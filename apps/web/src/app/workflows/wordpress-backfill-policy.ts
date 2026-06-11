export function shouldReprocessImportedPost(existingStatus: string) {
  return existingStatus !== "published";
}
