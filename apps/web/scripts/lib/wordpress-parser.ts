import { JSDOM } from "jsdom";

export type AppCategory = "COUNTRY" | "EDM" | "HARDCORE & ROCK" | "HIP-HOP & R&B" | "OTHER";

export interface FirecrawlScrapePayload {
  html: string;
  metadata?: Record<string, unknown>;
  sourceUrl?: string;
}

export interface ParsedWordpressArticle {
  sourceUrl: string;
  slug: string;
  title: string;
  excerpt: string;
  contentHtml: string;
  coverImageUrl: string | null;
  inlineImageUrls: string[];
  authorName: string;
  authorSlug: string;
  rawCategories: string[];
  category: AppCategory;
  sourcePublishedAt: Date;
  sourceModifiedAt: Date | null;
}

const WORDPRESS_POST_URL_PATTERN =
  /^https:\/\/deadpartymedia\.wordpress\.com\/(\d{4})\/(\d{2})\/(\d{2})\/([^/]+)\/?$/;

const CONTENT_STRIP_SELECTORS = [
  "#jp-post-flair",
  ".sharedaddy",
  ".sd-sharing",
  ".sd-like",
  ".comment-respond",
  "#respond",
  "form.comment-form",
  "[id^='wordads']",
  "script",
  "style",
];

export function isWordpressPostPermalink(url: string): boolean {
  return WORDPRESS_POST_URL_PATTERN.test(url);
}

export function extractPermalinkSlug(url: string): string | null {
  const match = url.match(WORDPRESS_POST_URL_PATTERN);
  if (!match) {return null;}
  return match[4] || null;
}

export function extractPermalinkDate(url: string): Date | null {
  const match = url.match(WORDPRESS_POST_URL_PATTERN);
  if (!match) {return null;}

  const [_, year, month, day] = match;
  const value = new Date(`${year}-${month}-${day}T00:00:00.000Z`);
  return Number.isNaN(value.valueOf()) ? null : value;
}

export function normalizeAuthorSlug(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9\s-]/g, "")
    .replaceAll(/[\s_-]+/g, "-")
    .replaceAll(/^-+|-+$/g, "")
    .slice(0, 120);
}

export function mapWordpressCategory(rawCategories: string[]): AppCategory {
  const normalized = rawCategories.map((value) => value.trim().toLowerCase().replaceAll(/\s+/g, " "));

  for (const category of normalized) {
    if (category === "country") {return "COUNTRY";}
    if (category === "edm") {return "EDM";}
    if (
      category === "hardcore & rock" ||
      category === "hardcore-rock" ||
      category === "hardcore and rock"
    ) {
      return "HARDCORE & ROCK";
    }
    if (
      category === "hip-hop & r&b" ||
      category === "hip-hop and r&b" ||
      category === "hip hop & r&b" ||
      category === "hip-hop-rb" ||
      category === "hip-hop/r&b"
    ) {
      return "HIP-HOP & R&B";
    }
  }

  return "OTHER";
}

function cleanText(value: string): string {
  return value.replaceAll(/\s+/g, " ").trim();
}

function truncateExcerpt(value: string, maxLength: number): string {
  const cleaned = cleanText(value);
  if (cleaned.length <= maxLength) {return cleaned;}
  return `${cleaned.slice(0, maxLength - 1).trimEnd()}…`;
}

function getMetadataString(metadata: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
}

function parseSourceUrl(payload: FirecrawlScrapePayload): string {
  const metadata = payload.metadata ?? {};
  const candidate =
    getMetadataString(metadata, ["sourceURL", "url", "og:url", "ogUrl"]) ?? payload.sourceUrl;

  if (!candidate) {
    throw new Error("Missing source URL in Firecrawl payload");
  }

  return candidate;
}

function parsePublishedAt(metadata: Record<string, unknown>, rootDocument: Document): Date {
  const metadataValue = getMetadataString(metadata, ["article:published_time", "publishedTime"]);

  if (metadataValue) {
    const published = new Date(metadataValue);
    if (!Number.isNaN(published.valueOf())) {
      return published;
    }
  }

  const datetime = rootDocument.querySelector(".wp-block-post-date time")?.getAttribute("datetime");

  if (datetime) {
    const published = new Date(datetime);
    if (!Number.isNaN(published.valueOf())) {
      return published;
    }
  }

  const textDate = rootDocument.querySelector(".wp-block-post-date")?.textContent;
  if (textDate) {
    const published = new Date(cleanText(textDate));
    if (!Number.isNaN(published.valueOf())) {
      return published;
    }
  }

  throw new Error("Unable to determine publish date");
}

function parseModifiedAt(metadata: Record<string, unknown>): Date | null {
  const metadataValue = getMetadataString(metadata, ["article:modified_time", "modifiedTime"]);
  if (!metadataValue) {return null;}

  const modified = new Date(metadataValue);
  return Number.isNaN(modified.valueOf()) ? null : modified;
}

function parseTitle(metadata: Record<string, unknown>, rootDocument: Document): string {
  const heading = rootDocument.querySelector("h1.wp-block-post-title")?.textContent;
  if (heading && cleanText(heading).length > 0) {
    return cleanText(heading);
  }

  const metadataTitle = getMetadataString(metadata, ["og:title", "title", "ogTitle"]);
  if (metadataTitle) {
    return cleanText(metadataTitle.replace(/\s+[–-]\s+Dead Party Media\s*$/u, ""));
  }

  throw new Error("Unable to determine article title");
}

function parseExcerpt(metadata: Record<string, unknown>, entryContent: Element): string {
  const metadataDescription = getMetadataString(metadata, ["description", "og:description"]);
  if (metadataDescription) {
    return truncateExcerpt(metadataDescription, 500);
  }

  const paragraphText = entryContent.querySelector("p")?.textContent;
  if (paragraphText && cleanText(paragraphText).length > 0) {
    return truncateExcerpt(paragraphText, 500);
  }

  return "Imported from WordPress";
}

function absolutizeUrl(url: string, sourceUrl: string): string {
  try {
    return new URL(url, sourceUrl).toString();
  } catch {
    return url;
  }
}

function collectRawCategories(rootDocument: Document): string[] {
  const categoryLinks = rootDocument.querySelectorAll(".taxonomy-category a");
  const categories = new Set<string>();

  for (const link of categoryLinks) {
    const text = cleanText(link.textContent ?? "");
    if (text) {categories.add(text);}
  }

  return [...categories];
}

export function parseWordpressArticle(payload: FirecrawlScrapePayload): ParsedWordpressArticle {
  const sourceUrl = parseSourceUrl(payload);
  if (!isWordpressPostPermalink(sourceUrl)) {
    throw new Error(`Not a supported WordPress post URL: ${sourceUrl}`);
  }

  const dom = new JSDOM(payload.html);
  const rootDocument = dom.window.document;
  const metadata = payload.metadata ?? {};

  const title = parseTitle(metadata, rootDocument);
  const slug = extractPermalinkSlug(sourceUrl) ?? normalizeAuthorSlug(title);

  const entryContent = rootDocument.querySelector(".entry-content");
  if (!entryContent) {
    throw new Error("Unable to locate .entry-content");
  }

  for (const selector of CONTENT_STRIP_SELECTORS) {
    const matches = entryContent.querySelectorAll(selector);
    for (const node of matches) {
      node.remove();
    }
  }

  const coverImageNode = rootDocument.querySelector(".wp-block-post-featured-image img[src]");
  const coverImageUrl = coverImageNode?.getAttribute("src")
    ? absolutizeUrl(coverImageNode.getAttribute("src") ?? "", sourceUrl)
    : null;

  const inlineImageUrls = [...entryContent.querySelectorAll('img[src]')]
    .map((node) => node.getAttribute("src") ?? "")
    .map((value) => absolutizeUrl(value, sourceUrl))
    .filter((value) => value.length > 0);

  const contentHtml = entryContent.innerHTML.trim();
  if (!contentHtml) {
    throw new Error("Article content is empty after cleanup");
  }

  const authorName =
    cleanText(rootDocument.querySelector(".wp-block-post-author__name")?.textContent ?? "") ||
    "unknown";
  const authorSlug = normalizeAuthorSlug(authorName) || "unknown";

  const rawCategories = collectRawCategories(rootDocument);
  const category = mapWordpressCategory(rawCategories);

  const sourcePublishedAt = parsePublishedAt(metadata, rootDocument);
  const sourceModifiedAt = parseModifiedAt(metadata);
  const excerpt = parseExcerpt(metadata, entryContent);

  return {
    authorName,
    authorSlug,
    category,
    contentHtml,
    coverImageUrl,
    excerpt,
    inlineImageUrls,
    rawCategories,
    slug,
    sourceModifiedAt,
    sourcePublishedAt,
    sourceUrl,
    title,
  };
}
