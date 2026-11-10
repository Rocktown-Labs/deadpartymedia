import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { splitSqliteStatements } from "@alchemy.run/sql/SqlFile";
const { values: args } = parseArgs({
  options: {
    sql: { type: "string" },
    "database-id": { type: "string" },
    "expected-name": { type: "string" },
    "account-id": { type: "string" },
    "token-env": { type: "string", default: "CLOUDFLARE_API_TOKEN" },
    apply: { type: "boolean", default: false },
  },
});
if (!args.sql || !args["database-id"] || !args["expected-name"] || !args["account-id"])
  throw new Error(
    "Pass --sql <private.sql> --database-id <uuid> --expected-name <name> --account-id <account>. Omit --apply for dry-run.",
  );
const statements = splitSqliteStatements(await readFile(args.sql, "utf8")).filter(
  (s) => s.trim() && !/^\s*PRAGMA\s+foreign_key_check/i.test(s),
);
if (statements.some((s) => new TextEncoder().encode(s).byteLength > 95000))
  throw new Error("An individual statement exceeds the conservative D1 request size limit");
console.log(
  JSON.stringify({
    dryRun: !args.apply,
    database: args["expected-name"],
    statements: statements.length,
  }),
);
if (!args.apply) process.exit(0);
const token = process.env[args["token-env"]];
if (!token) throw new Error("Set CLOUDFLARE_API_TOKEN before importing");
const base = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(args["account-id"])}/d1/database/${encodeURIComponent(args["database-id"])}`;
const call = async (path, body) => {
  const response = await fetch(base + path, {
    method: body ? "POST" : "GET",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json();
  if (!response.ok || !data.success)
    throw new Error(`D1 request failed (${response.status}): ${JSON.stringify(data.errors)}`);
  return data.result;
};
const metadata = await call("");
if (metadata.name !== args["expected-name"])
  throw new Error("Database name does not match expected target; refusing import");
let applied = 0,
  batch = [];
const flush = async () => {
  if (!batch.length) return;
  await call("/query", { sql: batch.join(";\n") + ";" });
  applied += batch.length;
  batch = [];
};
for (const statement of statements) {
  if (batch.join(";\n").length + statement.length > 90000 || batch.length >= 20) await flush();
  batch.push(statement);
}
await flush();
const check = await call("/query", { sql: "PRAGMA foreign_key_check;" });
if (check.some((result) => result.results?.length))
  throw new Error("Imported data has foreign key violations");
console.log(JSON.stringify({ applied, foreignKeyViolations: 0 }));
