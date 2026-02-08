/**
 * Upload utility functions for file validation and path generation
 */

export type UploadType = "cover" | "content" | "profile" | "event";

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export const MAX_FILE_SIZE = 4.5 * 1024 * 1024; // 4.5MB (Vercel server upload limit)

/**
 * Validate if a file is an allowed image type
 */
export function isValidImageType(file: File): boolean {
  return ALLOWED_IMAGE_TYPES.includes(
    file.type as (typeof ALLOWED_IMAGE_TYPES)[number]
  );
}

/**
 * Validate if a file size is within limits
 */
export function isValidFileSize(file: File): boolean {
  return file.size <= MAX_FILE_SIZE;
}

/**
 * Generate a pathname for an uploaded image based on type
 */
export function generateImagePathname(
  type: UploadType,
  filename: string,
  _addRandomSuffix: boolean = false
): string {
  const timestamp = Date.now();
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");

  let pathname: string;

  switch (type) {
    case "cover":
      pathname = `posts/covers/${timestamp}-${sanitizedFilename}`;
      break;
    case "content":
      pathname = `posts/content/${timestamp}-${sanitizedFilename}`;
      break;
    case "profile":
      pathname = `artists/profiles/${timestamp}-${sanitizedFilename}`;
      break;
    case "event":
      pathname = `events/images/${timestamp}-${sanitizedFilename}`;
      break;
    default:
      pathname = `uploads/${timestamp}-${sanitizedFilename}`;
  }

  // Note: addRandomSuffix is handled by Vercel Blob's put() option
  return pathname;
}

/**
 * Validate an uploaded file
 */
export function validateImageFile(file: File): {
  valid: boolean;
  error?: string;
} {
  if (!isValidImageType(file)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed types: ${ALLOWED_IMAGE_TYPES.join(", ")}`,
    };
  }

  if (!isValidFileSize(file)) {
    return {
      valid: false,
      error: `File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    };
  }

  return { valid: true };
}
