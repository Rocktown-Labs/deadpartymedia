interface NamedArtist {
  name: string;
}

const REFERENCE_PATTERNS = [
  /\bif you listen to\b/i,
  /\blisten to\b/i,
  /\bfans? of\b/i,
  /\binspired by\b/i,
  /\bsounds? like\b/i,
  /\breminds? me of\b/i,
  /\bsimilar to\b/i,
  /\bfor fans of\b/i,
];

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036F]/g, "")
    .replaceAll(/[^a-z0-9]+/g, " ")
    .trim();
}

function includesName(haystack: string, name: string) {
  const normalizedHaystack = ` ${normalizeText(haystack)} `;
  const normalizedName = normalizeText(name);
  return normalizedName.length > 0 && normalizedHaystack.includes(` ${normalizedName} `);
}

function stripHtml(value: string) {
  return value
    .replaceAll(/<[^>]*>/g, " ")
    .replaceAll(/\s+/g, " ")
    .trim();
}

function getMentionSentences(text: string, name: string) {
  return text.split(/(?<=[.!?])\s+/).filter((sentence) => includesName(sentence, name));
}

function isReferenceOnlyMention(text: string, name: string) {
  const sentences = getMentionSentences(text, name);
  return (
    sentences.length > 0 &&
    sentences.every((sentence) => REFERENCE_PATTERNS.some((pattern) => pattern.test(sentence)))
  );
}

function mentionCount(text: string, name: string) {
  const normalizedText = normalizeText(text);
  const normalizedName = normalizeText(name);
  if (!normalizedName) {
    return 0;
  }
  return normalizedText.split(normalizedName).length - 1;
}

export function selectPrimarySubjectArtists<T extends NamedArtist>(
  title: string,
  contentHtml: string,
  artistCandidates: T[],
) {
  if (artistCandidates.length <= 1) {
    return artistCandidates;
  }

  const titleMatches = artistCandidates.filter((artist) => includesName(title, artist.name));
  if (titleMatches.length > 0) {
    return titleMatches;
  }

  const contentText = stripHtml(contentHtml);
  const introText = contentText.slice(0, 900);
  const outroText = contentText.slice(-700);
  const scored = artistCandidates
    .map((artist, index) => {
      const introMention = includesName(introText, artist.name);
      const outroMention = includesName(outroText, artist.name);
      const referenceOnly = isReferenceOnlyMention(contentText, artist.name);
      const count = mentionCount(contentText, artist.name);

      return {
        artist,
        index,
        score: referenceOnly
          ? 0
          : (introMention ? 6 : 0) + (outroMention ? 5 : 0) + Math.min(count, 5),
      };
    })
    .filter((entry) => entry.score > 0)
    .toSorted((a, b) => b.score - a.score || a.index - b.index);

  if (scored.length === 0) {
    return artistCandidates.slice(0, 1);
  }

  return scored.slice(0, 3).map((entry) => entry.artist);
}
