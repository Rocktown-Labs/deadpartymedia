import { buildPublicUploadUrl } from "#/lib/upload.ts";

export interface ArtworkDraft {
  id: string;
  fileName: string;
  imageKey: string;
  previewUrl?: string;
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

export function createArtworkDrafts(files: unknown[], metadata?: unknown) {
  const drafts: ArtworkDraft[] = [];

  files.forEach((file, index) => {
    const candidate = file as {
      file?: File;
      url?: string;
    };
    const sourceFile = candidate.file;
    const fileName = sourceFile?.name ?? `Artwork ${index + 1}`;
    const imageKey = getUploadedObjectKey(file);

    if (!imageKey) {
      return;
    }

    let previewUrl = candidate.url;

    if (
      !previewUrl &&
      typeof window !== "undefined" &&
      typeof URL !== "undefined" &&
      typeof URL.createObjectURL === "function" &&
      sourceFile instanceof File
    ) {
      try {
        previewUrl = URL.createObjectURL(sourceFile);
      } catch {
        // Fall back to built URL
      }
    }

    if (!previewUrl) {
      previewUrl = buildPublicUploadUrl(imageKey, metadata);
    }

    drafts.push({
      description: "",
      fileName,
      forSale: false,
      id: crypto.randomUUID(),
      imageKey,
      previewUrl,
      medium: "",
      price: "",
      status: "published",
      title: titleFromFileName(fileName),
      year: "",
    });
  });

  return drafts;
}
