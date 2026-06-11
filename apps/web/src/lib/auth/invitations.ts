const DEFAULT_SITE_URL = "https://deadpartymedia.com";

function getCanonicalSiteUrl(): string {
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.split(",")[0]?.trim();
  const vercelUrl = process.env.VERCEL_URL?.trim();
  const candidate = configuredSiteUrl || (vercelUrl ? `https://${vercelUrl}` : DEFAULT_SITE_URL);

  try {
    const url = new URL(candidate);
    return url.origin;
  } catch {
    return DEFAULT_SITE_URL;
  }
}

export function buildInvitationRedirectUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  return new URL(path, getCanonicalSiteUrl()).toString();
}
