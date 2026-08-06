export function getPublicUploadUrl(objectKey: string) {
  const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
  const nodeEnv =
    typeof process === "undefined"
      ? undefined
      : (process.env as Record<string, string | undefined>);
  const publicBaseUrl = (
    viteEnv?.VITE_CLOUDFLARE_R2_PUBLIC_URL ??
    viteEnv?.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL ??
    nodeEnv?.CLOUDFLARE_R2_PUBLIC_URL
  )?.replace(/\/$/, "");

  if (!publicBaseUrl) {
    return objectKey;
  }

  return `${publicBaseUrl}/${objectKey.replace(/^\//, "")}`;
}
