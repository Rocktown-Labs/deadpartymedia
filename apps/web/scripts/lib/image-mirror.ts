import { put } from "@vercel/blob";
import { JSDOM } from "jsdom";

export type MirrorKind = "cover" | "content";

export type DownloadImageFn = (
  sourceUrl: string,
) => Promise<{ bytes: ArrayBuffer; contentType: string | null }>;

export type UploadImageFn = (params: {
  pathname: string;
  bytes: ArrayBuffer;
  contentType: string | null;
  addRandomSuffix: boolean;
}) => Promise<string>;

export interface ImageMirrorOptions {
  dryRun?: boolean;
  onWarn?: (message: string, error?: unknown) => void;
  downloadImage?: DownloadImageFn;
  uploadImage?: UploadImageFn;
}

export interface MirrorInlineHtmlResult {
  html: string;
  replacedCount: number;
  failedCount: number;
}

const IMAGE_EXTENSION_FROM_CONTENT_TYPE: Record<string, string> = {
  "image/gif": ".gif",
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

function sanitizeFilename(input: string): string {
  const fallback = "image";
  const basename = input.trim().length > 0 ? input : fallback;
  return basename.replaceAll(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || fallback;
}

function extractFileNameFromUrl(sourceUrl: string): string {
  try {
    const parsed = new URL(sourceUrl);
    const segment = parsed.pathname.split("/").filter(Boolean).pop() ?? "image";
    return sanitizeFilename(segment);
  } catch {
    return "image";
  }
}

function ensureImageExtension(filename: string, contentType: string | null): string {
  const hasKnownExtension = /\.(jpg|jpeg|png|webp|gif)$/i.test(filename);
  if (hasKnownExtension) {return filename;}

  const mappedExtension = contentType
    ? IMAGE_EXTENSION_FROM_CONTENT_TYPE[contentType.toLowerCase()]
    : undefined;

  if (mappedExtension) {return `${filename}${mappedExtension}`;}
  return `${filename}.jpg`;
}

function resolveAbsoluteUrl(url: string, baseUrl: string): string {
  try {
    return new URL(url, baseUrl).toString();
  } catch {
    return url;
  }
}

const defaultDownloadImage: DownloadImageFn = async (sourceUrl) => {
  const response = await fetch(sourceUrl);
  if (!response.ok) {
    throw new Error(`Failed to download image (${response.status}) from ${sourceUrl}`);
  }

  return {
    bytes: await response.arrayBuffer(),
    contentType: response.headers.get("content-type"),
  };
};

const defaultUploadImage: UploadImageFn = async ({
  pathname,
  bytes,
  contentType,
  addRandomSuffix,
}) => {
  const blob = await put(pathname, new Blob([bytes], { type: contentType ?? undefined }), {
    access: "public",
    addRandomSuffix,
  });

  return blob.url;
};

function buildPathname(
  kind: MirrorKind,
  sourceUrl: string,
): {
  pathname: string;
  addRandomSuffix: boolean;
} {
  const now = Date.now();
  const filename = extractFileNameFromUrl(sourceUrl);
  const folder = kind === "cover" ? "posts/covers" : "posts/content";
  const addRandomSuffix = kind === "content";

  return {
    addRandomSuffix,
    pathname: `${folder}/${now}-${filename}`,
  };
}

export function createImageMirror(options: ImageMirrorOptions = {}) {
  const dryRun = options.dryRun === true;
  const onWarn = options.onWarn ?? (() => {});
  const downloadImage = options.downloadImage ?? defaultDownloadImage;
  const uploadImage = options.uploadImage ?? defaultUploadImage;
  const cache = new Map<string, string>();

  async function mirrorImageUrl(sourceUrl: string, kind: MirrorKind): Promise<string> {
    if (dryRun) {return sourceUrl;}

    const cached = cache.get(sourceUrl);
    if (cached) {return cached;}

    const download = await downloadImage(sourceUrl);
    const { pathname, addRandomSuffix } = buildPathname(kind, sourceUrl);
    const finalPathname = ensureImageExtension(pathname, download.contentType);

    const mirroredUrl = await uploadImage({
      addRandomSuffix,
      bytes: download.bytes,
      contentType: download.contentType,
      pathname: finalPathname,
    });

    cache.set(sourceUrl, mirroredUrl);
    return mirroredUrl;
  }

  async function mirrorInlineImagesInHtml(
    html: string,
    baseUrl: string,
  ): Promise<MirrorInlineHtmlResult> {
    if (!html.trim()) {
      return { failedCount: 0, html, replacedCount: 0 };
    }

    const dom = new JSDOM(`<body>${html}</body>`);
    const doc = dom.window.document;
    const imageNodes = [...doc.querySelectorAll('img[src]')];
    let replacedCount = 0;
    let failedCount = 0;

    for (const node of imageNodes) {
      const currentSrc = node.getAttribute("src");
      if (!currentSrc) {continue;}

      const sourceUrl = resolveAbsoluteUrl(currentSrc, baseUrl);
      if (!/^https?:\/\//i.test(sourceUrl)) {continue;}

      try {
        const mirroredUrl = await mirrorImageUrl(sourceUrl, "content");
        node.setAttribute("src", mirroredUrl);
        replacedCount += 1;
      } catch (error) {
        failedCount += 1;
        onWarn(`Failed to mirror inline image: ${sourceUrl}`, error);
      }
    }

    return {
      failedCount,
      html: doc.body.innerHTML,
      replacedCount,
    };
  }

  return {
    mirrorImageUrl,
    mirrorInlineImagesInHtml,
  };
}
