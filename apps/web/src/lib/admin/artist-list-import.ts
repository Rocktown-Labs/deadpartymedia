export const ARTIST_IMPORT_GENRES = [
  "COUNTRY",
  "EDM",
  "HARDCORE & ROCK",
  "HIP-HOP & R&B",
  "OTHER",
] as const;

export type ArtistImportGenre = (typeof ARTIST_IMPORT_GENRES)[number];

export interface ArtistImportExistingArtist {
  id: number;
  name: string;
}

export interface ArtistImportRow {
  duplicateId: number | null;
  genre: ArtistImportGenre;
  id: string;
  image: string;
  location: string;
  name: string;
  spotifyArtistId: string;
  spotifyUrl: string;
  status: "ready" | "duplicate" | "created" | "skipped" | "error";
  statusMessage: string;
  website: string;
}

export function normalizeArtistImportName(value: string) {
  return value.toLowerCase().replaceAll(/[^a-z0-9]/g, "");
}

export function normalizeArtistImportGenre(value: string): ArtistImportGenre {
  const normalized = value.toLowerCase().trim();
  if (!normalized) {
    return "OTHER";
  }
  if (normalized.includes("country") || normalized.includes("folk")) {
    return "COUNTRY";
  }
  if (
    normalized.includes("edm") ||
    normalized.includes("electronic") ||
    normalized.includes("dj")
  ) {
    return "EDM";
  }
  if (
    normalized.includes("rock") ||
    normalized.includes("hardcore") ||
    normalized.includes("metal") ||
    normalized.includes("punk")
  ) {
    return "HARDCORE & ROCK";
  }
  if (
    normalized.includes("hip") ||
    normalized.includes("rap") ||
    normalized.includes("r&b") ||
    normalized.includes("rnb")
  ) {
    return "HIP-HOP & R&B";
  }
  return "OTHER";
}

export function parseArtistImportDelimited(text: string) {
  const rows: string[][] = [];
  const delimiter = text.includes("\t") ? "\t" : ",";
  let current = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const nextCharacter = text[index + 1];

    if (character === '"' && inQuotes && nextCharacter === '"') {
      current += '"';
      index += 1;
      continue;
    }
    if (character === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (character === delimiter && !inQuotes) {
      row.push(current.trim());
      current = "";
      continue;
    }
    if ((character === "\n" || character === "\r") && !inQuotes) {
      if (character === "\r" && nextCharacter === "\n") {
        index += 1;
      }
      row.push(current.trim());
      if (row.some(Boolean)) {
        rows.push(row);
      }
      row = [];
      current = "";
      continue;
    }

    current += character;
  }

  row.push(current.trim());
  if (row.some(Boolean)) {
    rows.push(row);
  }

  return rows;
}

function findColumnIndex(headers: string[], patterns: RegExp[], fallback: number) {
  const index = headers.findIndex((header) => patterns.some((pattern) => pattern.test(header)));
  return index !== -1 ? index : fallback;
}

export function buildArtistImportRows(
  text: string,
  existingArtists: ArtistImportExistingArtist[],
): ArtistImportRow[] {
  const rows = parseArtistImportDelimited(text);
  if (rows.length === 0) {
    return [];
  }

  const firstRow = rows[0].map((cell) => cell.toLowerCase());
  const hasHeader = firstRow.some((cell) => /artist|band|genre|city|region|location/.test(cell));
  const headers = hasHeader ? firstRow : [];
  const dataRows = hasHeader ? rows.slice(1) : rows;
  const nameIndex = hasHeader ? findColumnIndex(headers, [/band/, /artist/, /\bname\b/], 0) : 0;
  const genreIndex = hasHeader ? findColumnIndex(headers, [/genre/], 1) : 1;
  const locationIndex = hasHeader ? findColumnIndex(headers, [/city/, /region/, /location/], 2) : 2;
  const existingByKey = new Map(
    existingArtists.map((artist) => [normalizeArtistImportName(artist.name), artist]),
  );
  const seenInImport = new Map<string, number>();
  const importRows: ArtistImportRow[] = [];

  for (const [index, cells] of dataRows.entries()) {
    const name = (cells[nameIndex] ?? "").trim().replaceAll(/\s+/g, " ");
    const key = normalizeArtistImportName(name);
    if (!name || !key) {
      continue;
    }

    const duplicate = existingByKey.get(key);
    const previousCount = seenInImport.get(key) ?? 0;
    seenInImport.set(key, previousCount + 1);

    importRows.push({
      duplicateId: duplicate?.id ?? null,
      genre: normalizeArtistImportGenre(cells[genreIndex] ?? ""),
      id: `${key}-${index}`,
      image: "",
      location: (cells[locationIndex] ?? "").trim().replaceAll(/\s+/g, " ") || "Arkansas",
      name,
      spotifyArtistId: "",
      spotifyUrl: "",
      status: duplicate || previousCount > 0 ? "duplicate" : "ready",
      statusMessage: duplicate
        ? `Matches saved artist #${duplicate.id}`
        : previousCount > 0
          ? "Duplicate in this import"
          : "Ready to create hidden profile",
      website: "",
    });
  }

  return importRows;
}
