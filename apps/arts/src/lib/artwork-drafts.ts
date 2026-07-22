export interface ArtworkDraft {
  id: string;
  fileName: string;
  imageKey: string;
  title: string;
  medium: string;
  year: string;
  description: string;
  forSale: boolean;
  price: string;
  status: "draft" | "published";
}

export function getUploadedObjectKey(file: unknown) {
  const candidate = file as {
    objectInfo?: { key?: string };
    uploadedObject?: { key?: string };
    key?: string;
  };

  return candidate.objectInfo?.key ?? candidate.uploadedObject?.key ?? candidate.key ?? "";
}

export function titleFromFileName(fileName: string) {
  return fileName
    .replace(/\.[^.]+$/, "")
    .replaceAll(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function createArtworkDrafts(files: unknown[]) {
  const drafts: ArtworkDraft[] = [];

  files.forEach((file, index) => {
    const sourceFile = (file as { file?: File }).file;
    const fileName = sourceFile?.name ?? `Artwork ${index + 1}`;
    const imageKey = getUploadedObjectKey(file);

    if (!imageKey) {
      return;
    }

    drafts.push({
      description: "",
      fileName,
      forSale: false,
      id: crypto.randomUUID(),
      imageKey,
      medium: "",
      price: "",
      status: "published",
      title: titleFromFileName(fileName),
      year: "",
    });
  });

  return drafts;
}
