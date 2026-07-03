const siteUrl = "https://arts.deadpartymedia.com";
const siteName = "Dead Party Arts";
const defaultImage = `${siteUrl}/images/dead-party-arts-logo.jpeg`;

interface SeoInput {
  title: string;
  description: string;
  path?: string;
  image?: string | null;
  type?: "website" | "article" | "profile";
}

export function getAbsoluteUrl(path = "/") {
  return new URL(path, siteUrl).toString();
}

export function createSeoMeta({
  description,
  image = defaultImage,
  path = "/",
  title,
  type = "website",
}: SeoInput) {
  const url = getAbsoluteUrl(path);
  const fullTitle = title === siteName ? title : `${title} | ${siteName}`;

  return {
    links: [{ rel: "canonical", href: url }],
    meta: [
      { title: fullTitle },
      { name: "description", content: description },
      { property: "og:title", content: fullTitle },
      { property: "og:description", content: description },
      { property: "og:image", content: image ?? defaultImage },
      { property: "og:site_name", content: siteName },
      { property: "og:type", content: type },
      { property: "og:url", content: url },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: fullTitle },
      { name: "twitter:description", content: description },
      { name: "twitter:image", content: image ?? defaultImage },
    ],
  };
}

export { siteName, siteUrl };
