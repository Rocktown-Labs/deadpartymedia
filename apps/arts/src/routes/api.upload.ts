import { handleRequest, route, type Router } from "@better-upload/server";
import { cloudflare } from "@better-upload/server/clients";
import { createFileRoute } from "@tanstack/react-router";

// Image types accepted across arts upload routes. PDFs are accepted on the
// artwork route because artists routinely upload portfolio documents.
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
const ARTWORK_TYPES = [...IMAGE_TYPES, "application/pdf"];

// The browser builds public image URLs from this base. It is delivered through
// the upload response metadata because client bundles cannot read
// process.env at runtime and build-time VITE_ inlining has proven unreliable
// (see issue #90): the server always has the runtime value.
function getPublicBaseUrlMetadata() {
  const publicBaseUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL?.replace(/\/$/, "");

  return publicBaseUrl ? { publicBaseUrl } : {};
}

function requireR2Router(): Router {
  const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.CLOUDFLARE_R2_BUCKET;

  if (!(accountId && accessKeyId && secretAccessKey && bucketName)) {
    throw new Error(
      "Cloudflare R2 upload env is incomplete. Set CLOUDFLARE_R2_ACCOUNT_ID, CLOUDFLARE_R2_ACCESS_KEY_ID, CLOUDFLARE_R2_SECRET_ACCESS_KEY, and CLOUDFLARE_R2_BUCKET.",
    );
  }

  return {
    bucketName,
    client: cloudflare({
      accountId,
      accessKeyId,
      secretAccessKey,
    }),
    routes: {
      artwork: route({
        fileTypes: ARTWORK_TYPES,
        maxFileSize: 1024 * 1024 * 12,
        maxFiles: 12,
        multipleFiles: true,
        onAfterSignedUrl() {
          return { metadata: getPublicBaseUrlMetadata() };
        },
        onBeforeUpload() {
          return {
            generateObjectInfo: ({ file }) => {
              const safeName = file.name
                .toLowerCase()
                .replaceAll(/[^a-z0-9.]+/g, "-")
                .replaceAll(/^-|-$/g, "");
              return {
                key: `artworks/${crypto.randomUUID()}-${safeName || "upload"}`,
              };
            },
          };
        },
      }),
      profileImages: route({
        fileTypes: IMAGE_TYPES,
        maxFileSize: 1024 * 1024 * 8,
        maxFiles: 1,
        multipleFiles: false,
        onAfterSignedUrl() {
          return { metadata: getPublicBaseUrlMetadata() };
        },
        onBeforeUpload() {
          return {
            generateObjectInfo: ({ file }) => {
              const safeName = file.name
                .toLowerCase()
                .replaceAll(/[^a-z0-9.]+/g, "-")
                .replaceAll(/^-|-$/g, "");
              return {
                key: `artmaker-profiles/${crypto.randomUUID()}-${safeName || "profile"}`,
              };
            },
          };
        },
      }),
      articleImages: route({
        fileTypes: IMAGE_TYPES,
        maxFileSize: 1024 * 1024 * 12,
        maxFiles: 6,
        multipleFiles: true,
        onAfterSignedUrl() {
          return { metadata: getPublicBaseUrlMetadata() };
        },
        onBeforeUpload() {
          return {
            generateObjectInfo: ({ file }) => {
              const safeName = file.name
                .toLowerCase()
                .replaceAll(/[^a-z0-9.]+/g, "-")
                .replaceAll(/^-|-$/g, "");
              return {
                key: `arts-articles/${crypto.randomUUID()}-${safeName || "image"}`,
              };
            },
          };
        },
      }),
      eventFlyers: route({
        fileTypes: IMAGE_TYPES,
        maxFileSize: 1024 * 1024 * 12,
        maxFiles: 6,
        multipleFiles: true,
        onAfterSignedUrl() {
          return { metadata: getPublicBaseUrlMetadata() };
        },
        onBeforeUpload() {
          return {
            generateObjectInfo: ({ file }) => {
              const safeName = file.name
                .toLowerCase()
                .replaceAll(/[^a-z0-9.]+/g, "-")
                .replaceAll(/^-|-$/g, "");
              return {
                key: `event-flyers/${crypto.randomUUID()}-${safeName || "flyer"}`,
              };
            },
          };
        },
      }),
    },
  };
}

export const Route = createFileRoute("/api/upload")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          return handleRequest(request, requireR2Router());
        } catch (error) {
          return Response.json(
            {
              error:
                error instanceof Error
                  ? error.message
                  : "Upload route is not configured correctly.",
            },
            { status: 500 },
          );
        }
      },
    },
  },
});
