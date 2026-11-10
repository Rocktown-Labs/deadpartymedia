import { readFile, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { planClerkImport } from "../src/clerk-import";

const { values } = parseArgs({
  options: {
    csv: { type: "string" },
    snapshot: { type: "string" },
    memberships: { type: "string" },
    output: { type: "string" },
    app: { type: "string", default: "arts" },
  },
});
if (!values.csv || !values.snapshot)
  throw new Error(
    "Usage: pnpm import:clerk --csv <Clerk dashboard export> --snapshot <Clerk API users JSON> [--app arts|music|both] [--memberships <scoped-roles.json>] [--output <private.sql>]. Omit output for dry-run.",
  );
if (!["arts", "music", "both"].includes(values.app)) throw new Error("Invalid --app");
const apps: ("arts" | "music")[] =
  values.app === "both" ? ["arts", "music"] : values.app === "music" ? ["music"] : ["arts"];
const plan = planClerkImport(
  await readFile(values.csv, "utf8"),
  JSON.parse(await readFile(values.snapshot, "utf8")),
  apps,
  values.memberships ? JSON.parse(await readFile(values.memberships, "utf8")) : undefined,
);
if (values.output) await writeFile(values.output, plan.sql, { mode: 0o600, flag: "wx" });
console.log(JSON.stringify({ mode: values.output ? "sql-export" : "dry-run", ...plan.summary }));
