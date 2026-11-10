export interface PageMetadata {
  title?: string | { default: string; template?: string };
  description?: string;
  keywords?: string[];
  alternates?: { canonical?: string };
  openGraph?: {
    title?: string;
    description?: string;
    url?: string;
    siteName?: string;
    type?: string;
    locale?: string;
    images?: { url: string; alt?: string; width?: number; height?: number }[];
    publishedTime?: string;
    modifiedTime?: string;
    authors?: string[];
    tags?: string[];
    section?: string;
  };
  twitter?: { card?: string; title?: string; description?: string; images?: string[] };
}
export function pageHead(metadata?: PageMetadata) {
  if (!metadata) return {};
  const title =
    typeof metadata.title === "string"
      ? `${metadata.title} | Dead Party Media`
      : metadata.title?.default;
  const meta: { title?: string; name?: string; property?: string; content?: string }[] = [];
  if (title) meta.push({ title });
  if (metadata.description) meta.push({ name: "description", content: metadata.description });
  if (metadata.keywords) meta.push({ name: "keywords", content: metadata.keywords.join(", ") });
  const og = metadata.openGraph;
  for (const [name, value] of Object.entries({
    title: og?.title,
    description: og?.description,
    url: og?.url,
    site_name: og?.siteName,
    type: og?.type,
    locale: og?.locale,
  }))
    if (value) meta.push({ property: `og:${name}`, content: value });
  for (const image of og?.images ?? []) {
    meta.push({ property: "og:image", content: image.url });
    if (image.alt) meta.push({ property: "og:image:alt", content: image.alt });
  }
  for (const [key, value] of Object.entries({
    published_time: og?.publishedTime,
    modified_time: og?.modifiedTime,
    section: og?.section,
  }))
    if (value) meta.push({ property: `article:${key}`, content: value });
  for (const [name, value] of Object.entries({
    card: metadata.twitter?.card,
    title: metadata.twitter?.title,
    description: metadata.twitter?.description,
    image: metadata.twitter?.images?.[0],
  }))
    if (value) meta.push({ name: `twitter:${name}`, content: value });
  return {
    meta,
    links: metadata.alternates?.canonical
      ? [{ rel: "canonical", href: metadata.alternates.canonical }]
      : [],
  };
}
