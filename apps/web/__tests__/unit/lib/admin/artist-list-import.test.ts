import {
  buildArtistImportRows,
  normalizeArtistImportGenre,
  parseArtistImportDelimited,
} from "@/lib/admin/artist-list-import";

describe("artist list import helpers", () => {
  it("parses quoted CSV rows", () => {
    const rows = parseArtistImportDelimited(
      'Band/Artist Name,Genre,City/Region\n"Pat B, Da Truth",Hip-Hop,"Little Rock, AR"',
    );

    expect(rows).toStrictEqual([
      ["Band/Artist Name", "Genre", "City/Region"],
      ["Pat B, Da Truth", "Hip-Hop", "Little Rock, AR"],
    ]);
  });

  it("parses TSV exports and normalizes genres", () => {
    const rows = buildArtistImportRows(
      "Band/Artist Name\tGenre\tCity/Region\nHarbingers\trock\tKansas\nBeef\tdj\tLittle Rock",
      [],
    );

    expect(rows).toMatchObject([
      {
        genre: "HARDCORE & ROCK",
        location: "Kansas",
        name: "Harbingers",
        status: "ready",
      },
      {
        genre: "EDM",
        location: "Little Rock",
        name: "Beef",
        status: "ready",
      },
    ]);
  });

  it("detects existing artists and duplicates inside the import", () => {
    const rows = buildArtistImportRows(
      "Band/Artist Name,Genre,City/Region\nPat B Da Truth,Rap,Little Rock\nPat B Da Truth,Rap,Little Rock\nCampocalyspe,Hip-Hop,Arkansas",
      [{ id: 42, name: "Pat B Da Truth" }],
    );

    expect(rows[0]).toMatchObject({
      duplicateId: 42,
      status: "duplicate",
      statusMessage: "Matches saved artist #42",
    });
    expect(rows[1]).toMatchObject({
      duplicateId: 42,
      status: "duplicate",
    });
    expect(rows[2]).toMatchObject({
      duplicateId: null,
      genre: "HIP-HOP & R&B",
      status: "ready",
    });
  });

  it("falls back to first three columns when a file has no header", () => {
    const rows = buildArtistImportRows("Silent WVLF,Metal,Little Rock", []);

    expect(rows[0]).toMatchObject({
      genre: "HARDCORE & ROCK",
      location: "Little Rock",
      name: "Silent WVLF",
    });
  });

  it("uses OTHER for unknown genres", () => {
    expect(normalizeArtistImportGenre("experimental noise")).toBe("OTHER");
  });
});
