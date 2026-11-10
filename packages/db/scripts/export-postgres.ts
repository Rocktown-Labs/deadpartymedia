import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { Client } from "pg";
import { getTableColumns, getTableName } from "drizzle-orm";
import type { SQLiteTable } from "drizzle-orm/sqlite-core";
import * as schema from "../src/d1/schema";

const domains = {
  arts: [
    schema.users,
    schema.venues,
    schema.artmakers,
    schema.posts,
    schema.events,
    schema.artworks,
    schema.postArtmakers,
    schema.eventArtmakers,
  ],
  music: [
    schema.users,
    schema.venues,
    schema.artists,
    schema.posts,
    schema.events,
    schema.musicReleases,
    schema.articleComments,
    schema.userArticleReads,
    schema.userArticleSaves,
    schema.postArtists,
    schema.eventArtists,
    schema.postImportSources,
    schema.backfillRuns,
  ],
} as const;
const { values } = parseArgs({
  options: {
    out: { type: "string" },
    "database-url-env": { type: "string", default: "MIGRATION_SOURCE_DATABASE_URL" },
  },
  strict: true,
});
const connectionString = process.env[values["database-url-env"]!];
if (!connectionString || !values.out)
  throw new Error(
    "Set MIGRATION_SOURCE_DATABASE_URL and pass --out <private-directory>. The source is read only.",
  );
const out = path.resolve(values.out);
await mkdir(out, { recursive: true, mode: 0o700 });
const client = new Client({ connectionString });
const snapshot: Record<string, Record<string, unknown>[]> = {};
const identifier = (name: string) => `"${name.replaceAll('"', '""')}"`;
function literal(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Invalid numeric value");
    return String(value);
  }
  if (typeof value === "boolean") return value ? "1" : "0";
  if (value instanceof Date) return literal(value.getTime());
  if (typeof value === "object") return literal(JSON.stringify(value));
  if (typeof value !== "string") throw new Error("A column could not be converted to SQLite");
  return `'${value.replaceAll("'", "''")}'`;
}
function sqliteInsert(table: SQLiteTable, row: Record<string, unknown>) {
  const columns = Object.values(getTableColumns(table)).filter((column) => column.name in row);
  const values = columns.map((column) =>
    row[column.name] == null ? "NULL" : literal(column.mapToDriverValue(row[column.name])),
  );
  const id = columns.find((column) => column.name === "id");
  const updates = columns
    .filter((column) => column !== id)
    .map((column) => `${identifier(column.name)} = excluded.${identifier(column.name)}`);
  const conflict = id
    ? `ON CONFLICT ("id") DO UPDATE SET ${updates.join(", ")}`
    : "ON CONFLICT DO NOTHING";
  return `INSERT INTO ${identifier(getTableName(table))} (${columns.map((column) => identifier(column.name)).join(", ")}) VALUES (${values.join(", ")}) ${conflict};`;
}
await client.connect();
try {
  await client.query("BEGIN READ ONLY");
  for (const table of new Set([...domains.arts, ...domains.music])) {
    const name = getTableName(table);
    const result = await client.query<Record<string, unknown>>(
      `SELECT * FROM ${identifier(name)} ORDER BY 1`,
    );
    snapshot[name] = result.rows;
  }
  await client.query("COMMIT");
  await writeFile(path.join(out, "source.export.json"), JSON.stringify(snapshot, null, 2), {
    mode: 0o600,
    flag: "wx",
  });
  const counts: Record<string, Record<string, number>> = {};
  for (const app of ["arts", "music"] as const) {
    const posts = (snapshot.posts || []).filter((row) => row.vertical === app),
      events = (snapshot.events || []).filter((row) => row.vertical === app);
    const postIds = new Set(posts.map((row) => row.id)),
      eventIds = new Set(events.map((row) => row.id));
    const requiredUsers = new Set([
      ...posts.map((row) => row.author_id),
      ...events.map((row) => row.created_by_id),
    ]);
    const owners =
      app === "arts"
        ? (snapshot.artmakers || []).map((row) => row.clerk_user_id)
        : [
            ...(snapshot.artists || []).map((row) => row.claimed_by_id),
            ...(snapshot.venues || []).map((row) => row.claimed_by_id),
            ...(snapshot.music_releases || []).map((row) => row.author_id),
            ...(snapshot.article_comments || []).map((row) => row.clerk_user_id),
          ];
    for (const owner of owners) if (owner) requiredUsers.add(owner);
    const roles = new Set(
      app === "arts"
        ? ["super_admin", "arts_admin", "arts_writer", "artmaker"]
        : ["super_admin", "writer", "artist", "venue", "fan"],
    );
    const statements: string[] = [],
      domainCounts: Record<string, number> = {};
    for (const table of domains[app]) {
      const name = getTableName(table);
      let rows = snapshot[name] || [];
      if (name === "users")
        rows = rows.filter((row) => requiredUsers.has(row.clerk_id) || roles.has(String(row.role)));
      else if (name === "posts") rows = posts;
      else if (name === "events") rows = events;
      else if ("post_id" in (rows[0] || {})) rows = rows.filter((row) => postIds.has(row.post_id));
      else if ("event_id" in (rows[0] || {}))
        rows = rows.filter((row) => eventIds.has(row.event_id));
      const queries = [...new Set(rows.map((row) => sqliteInsert(table, row)))];
      statements.push(...queries);
      domainCounts[name] = queries.length;
    }
    counts[app] = domainCounts;
    await writeFile(
      path.join(out, `${app}.data-import.sql`),
      `-- Read-only PostgreSQL export. Apply after native D1 migrations.\nPRAGMA foreign_keys = ON;\n${statements.join("\n")}\nPRAGMA foreign_key_check;\n`,
      { mode: 0o600, flag: "wx" },
    );
  }
  await writeFile(path.join(out, "counts.json"), JSON.stringify(counts, null, 2), {
    mode: 0o600,
    flag: "wx",
  });
  console.log(JSON.stringify({ sourceReadOnly: true, outputDirectory: out, counts }, null, 2));
} finally {
  await client.end();
}
