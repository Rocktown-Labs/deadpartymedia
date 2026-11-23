/**
 * Ported from apps/web/src/lib/upload.ts — file validation and path
 * generation for R2 uploads (replaces Vercel Blob).
 */

export type UploadType = "cover" | "content" | "profile" | "event" | "venue" | "release" | "audio";

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export const ALLOWED_AUDIO_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "audio/ogg",
  "audio/mp4",
  "audio/x-m4a",
  "audio/aac",
  "audio/flac",
  "audio/webm",
] as const;

export const MAX_FILE_SIZE = 12 * 1024 * 1024;

export function isValidImageType(file: File): boolean {
  return ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number]);
}

export function isValidAudioType(file: File): boolean {
  return ALLOWED_AUDIO_TYPES.includes(file.type as (typeof ALLOWED_AUDIO_TYPES)[number]);
}

export function isValidFileSize(file: File): boolean {
  return file.size <= MAX_FILE_SIZE;
}

export function generateImagePathname(
  type: UploadType,
  filename: string,
  _addRandomSuffix: boolean = false,
): string {
  const timestamp = Date.now();
  const sanitizedFilename = filename.replaceAll(/[^a-zA-Z0-9.-]/g, "_");

  let pathname: string;

  switch (type) {
    case "cover": {
      pathname = `posts/covers/${timestamp}-${sanitizedFilename}`;
      break;
    }
    case "content": {
      pathname = `posts/content/${timestamp}-${sanitizedFilename}`;
      break;
    }
    case "profile": {
      pathname = `artists/profiles/${timestamp}-${sanitizedFilename}`;
      break;
    }
    case "event": {
      pathname = `events/images/${timestamp}-${sanitizedFilename}`;
      break;
    }
    case "venue": {
      pathname = `venues/images/${timestamp}-${sanitizedFilename}`;
      break;
    }
    case "release": {
      pathname = `music/covers/${timestamp}-${sanitizedFilename}`;
      break;
    }
    case "audio": {
      pathname = `music/audio/${timestamp}-${sanitizedFilename}`;
      break;
    }
    default: {
      pathname = `uploads/${timestamp}-${sanitizedFilename}`;
    }
  }

  return pathname;
}

export function validateImageFile(file: File): {
  valid: boolean;
  error?: string;
} {
  if (!isValidImageType(file)) {
    return {
      error: `Invalid file type. Allowed types: ${ALLOWED_IMAGE_TYPES.join(", ")}`,
      valid: false,
    };
  }

  if (!isValidFileSize(file)) {
    return {
      error: `File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      valid: false,
    };
  }

  return { valid: true };
}

export function validateAudioFile(file: File): {
  valid: boolean;
  error?: string;
} {
  if (!isValidAudioType(file)) {
    return {
      error: `Invalid audio file type. Allowed types: ${ALLOWED_AUDIO_TYPES.join(", ")}`,
      valid: false,
    };
  }

  if (!isValidFileSize(file)) {
    return {
      error: `File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      valid: false,
    };
  }

  return { valid: true };
}
