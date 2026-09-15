import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type MigrationEntry = {
  idx: number;
  tag: string;
  when: number;
};

type MigrationJournal = {
  entries: MigrationEntry[];
};

const journalPath = resolve(process.cwd(), "drizzle/meta/_journal.json");
const journal = JSON.parse(readFileSync(journalPath, "utf8")) as MigrationJournal;

// This inversion predates the guard. Rewriting an applied migration's timestamp can make
// Drizzle treat it as pending, so preserve the exact historical pair while preventing new inversions.
const knownHistoricalInversion = {
  current: {
    tag: "0006_sloppy_marrow",
    when: 1770501197219,
  },
  previous: {
    tag: "0005_sparkling_activity_tables",
    when: 1770505200000,
  },
};

describe("Drizzle migration journal", () => {
  it("keeps indexes contiguous and newly appended timestamps increasing", () => {
    const violations: string[] = [];
    let latestWhen = Number.NEGATIVE_INFINITY;

    for (const [index, entry] of journal.entries.entries()) {
      if (entry.idx !== index) {
        violations.push(`${entry.tag}: idx ${entry.idx} !== ${index}`);
      }

      const previousEntry = journal.entries[index - 1];
      const isKnownHistoricalInversion =
        entry.tag === knownHistoricalInversion.current.tag &&
        entry.when === knownHistoricalInversion.current.when &&
        previousEntry?.tag === knownHistoricalInversion.previous.tag &&
        previousEntry.when === knownHistoricalInversion.previous.when;

      if (entry.when <= latestWhen && !isKnownHistoricalInversion) {
        violations.push(`${entry.tag}: when ${entry.when} <= previous maximum ${latestWhen}`);
      }

      latestWhen = Math.max(latestWhen, entry.when);
    }

    expect(violations).toEqual([]);
  });
});
