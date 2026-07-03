export function getPublicUploadUrl(objectKey: string) {
  const publicBaseUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL?.replace(/\/$/, "");

  if (!publicBaseUrl) {
    return objectKey;
  }

  return `${publicBaseUrl}/${objectKey.replace(/^\//, "")}`;
}
