export type ParsedVideoLink =
  | {
      kind: "embed";
      provider: "YouTube" | "Vimeo";
      embedUrl: string;
      watchUrl: string;
    }
  | {
      kind: "external";
      provider: "Instagram" | "TikTok" | "Video";
      watchUrl: string;
    };

const YOUTUBE_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const VIMEO_ID_PATTERN = /^\d+$/;

export function isValidVideoUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 2048) {
    return false;
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

export function parseVideoLink(value: string | null | undefined): ParsedVideoLink | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (!isValidVideoUrl(trimmed)) {
    return null;
  }

  const url = new URL(trimmed);
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  const segments = url.pathname.split("/").filter(Boolean);

  // YouTube: youtube.com/watch?v=, youtu.be/<id>, /shorts/<id>, /embed/<id>, /live/<id>
  if (host === "youtu.be") {
    const id = segments[0] ?? "";
    if (YOUTUBE_ID_PATTERN.test(id)) {
      return {
        embedUrl: `https://www.youtube-nocookie.com/embed/${id}?rel=0`,
        kind: "embed",
        provider: "YouTube",
        watchUrl: trimmed,
      };
    }
  } else if (
    host === "youtube.com" ||
    host === "m.youtube.com" ||
    host === "youtube-nocookie.com"
  ) {
    let id = "";
    if (url.pathname === "/watch") {
      id = url.searchParams.get("v") ?? "";
    } else if (segments[0] === "shorts" || segments[0] === "embed" || segments[0] === "live") {
      id = segments[1] ?? "";
    }
    if (YOUTUBE_ID_PATTERN.test(id)) {
      return {
        embedUrl: `https://www.youtube-nocookie.com/embed/${id}?rel=0`,
        kind: "embed",
        provider: "YouTube",
        watchUrl: trimmed,
      };
    }
  }

  // Vimeo: vimeo.com/<id>, vimeo.com/<id>/<hash>, vimeo.com/channels/<name>/<id>, player.vimeo.com/video/<id>
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    let idIndex = -1;
    for (let index = segments.length - 1; index >= 0; index -= 1) {
      if (VIMEO_ID_PATTERN.test(segments[index] ?? "")) {
        idIndex = index;
        break;
      }
    }
    if (idIndex >= 0) {
      const id = segments[idIndex];
      const nextSegment = segments[idIndex + 1];
      const hashParam =
        url.searchParams.get("h") ??
        (nextSegment && /^[A-Za-z0-9]+$/.test(nextSegment) ? nextSegment : null);
      const embedParams = new URLSearchParams();
      if (hashParam) {
        embedParams.set("h", hashParam);
      }
      embedParams.set("dnt", "1");
      return {
        embedUrl: `https://player.vimeo.com/video/${id}?${embedParams.toString()}`,
        kind: "embed",
        provider: "Vimeo",
        watchUrl: trimmed,
      };
    }
  }

  if (host === "instagram.com" || host.endsWith(".instagram.com")) {
    return { kind: "external", provider: "Instagram", watchUrl: trimmed };
  }

  if (host === "tiktok.com" || host.endsWith(".tiktok.com")) {
    return { kind: "external", provider: "TikTok", watchUrl: trimmed };
  }

  return { kind: "external", provider: "Video", watchUrl: trimmed };
}
