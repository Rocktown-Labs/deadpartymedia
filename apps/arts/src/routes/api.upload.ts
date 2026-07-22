import { handleRequest, route, type Router } from "@better-upload/server";
import { cloudflare } from "@better-upload/server/clients";
import { createFileRoute } from "@tanstack/react-router";

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
        fileTypes: ["image/*"],
        maxFileSize: 1024 * 1024 * 12,
        maxFiles: 12,
        multipleFiles: true,
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
        fileTypes: ["image/*"],
        maxFileSize: 1024 * 1024 * 8,
        maxFiles: 1,
        multipleFiles: false,
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
        fileTypes: ["image/*"],
        maxFileSize: 1024 * 1024 * 12,
        maxFiles: 6,
        multipleFiles: true,
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
        fileTypes: ["image/*"],
        maxFileSize: 1024 * 1024 * 12,
        maxFiles: 6,
        multipleFiles: true,
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
