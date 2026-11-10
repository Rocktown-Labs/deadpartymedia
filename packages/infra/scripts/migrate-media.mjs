import { createHash } from "node:crypto";
import { readFile, writeFile, rename } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";

const { values: args } = parseArgs({
  options: {
    sql: { type: "string" },
    bucket: { type: "string" },
    "public-base": { type: "string" },
    "account-id": { type: "string" },
    "token-env": { type: "string", default: "CLOUDFLARE_API_TOKEN" },
    apply: { type: "boolean", default: false },
  },
});
if (!args.sql || !args.bucket || !args["public-base"])
  throw new Error(
    "Pass --sql <private-data-import.sql> --bucket <target-bucket> --public-base <public-media-url>. Omit --apply for a dry run.",
  );
const publicURL = new URL(args["public-base"]);
if (publicURL.protocol !== "https:") throw new Error("The public media base must use HTTPS");
if (!args.sql.endsWith(".data-import.sql"))
  throw new Error("The input filename must end in .data-import.sql");
const sqlPath = path.resolve(args.sql),
  sql = await readFile(sqlPath, "utf8");
const ownedHost = (host) =>
  host.endsWith(".public.blob.vercel-storage.com") ||
  host === "img.clerk.com" ||
  host.endsWith(".clerk.accounts.dev");
const urls = [
  ...new Set(
    [...sql.matchAll(/https:\/\/[^\s"'<>\\]+/g)]
      .map((match) => match[0])
      .filter((value) => {
        try {
          return ownedHost(new URL(value.replaceAll("&amp;", "&")).hostname);
        } catch {
          return false;
        }
      }),
  ),
];
const manifestPath = `${sqlPath}.media-map.export.json`;
let manifest = {};
try {
  manifest = JSON.parse(await readFile(manifestPath, "utf8"));
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
console.log(
  JSON.stringify({
    dryRun: !args.apply,
    ownedAssets: urls.length,
    previouslyVerified: urls.filter((url) => manifest[url]?.verified).length,
    bucket: args.bucket,
  }),
);
if (!args.apply) process.exit(0);
const token = process.env[args["token-env"]];
if (!token || !args["account-id"])
  throw new Error("Set CLOUDFLARE_API_TOKEN and pass --account-id before applying the media copy");
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
const base = args["public-base"].replace(/\/$/, "");
const mediaTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
  "image/svg+xml",
  "application/pdf",
  "audio/mpeg",
  "audio/mp4",
]);
for (let index = 0; index < urls.length; index++) {
  const source = urls[index];
  const previous = manifest[source];
  if (
    previous?.verified &&
    previous.accountId === args["account-id"] &&
    previous.bucket === args.bucket &&
    previous.publicBase === base
  ) {
    const endpoint = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(args["account-id"])}/r2/buckets/${encodeURIComponent(args.bucket)}/objects/${previous.key.split("/").map(encodeURIComponent).join("/")}`;
    const verification = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(30000),
    });
    if (
      verification.ok &&
      digest(new Uint8Array(await verification.arrayBuffer())) === previous.sha256
    )
      continue;
  }
  const response = await fetch(source.replaceAll("&amp;", "&"), {
    signal: AbortSignal.timeout(30000),
  });
  const type = response.headers.get("content-type")?.split(";")[0];
  if (!response.ok || !response.body || !mediaTypes.has(type))
    throw new Error(`Media download failed at item ${index + 1}: status ${response.status}`);
  let size = 0;
  const body = response.body.pipeThrough(
    new TransformStream({
      transform(chunk, controller) {
        size += chunk.byteLength;
        if (size > 32 * 1024 * 1024)
          throw new Error("A source asset exceeds the 32 MB migration limit");
        controller.enqueue(chunk);
      },
    }),
  );
  const bytes = new Uint8Array(await new Response(body).arrayBuffer());
  const extension =
    {
      "image/jpeg": "jpg",
      "image/svg+xml": "svg",
      "application/pdf": "pdf",
      "audio/mpeg": "mp3",
      "audio/mp4": "m4a",
    }[type] || type.split("/")[1];
  const key = `migration/${digest(source)}.${extension}`;
  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(args["account-id"])}/r2/buckets/${encodeURIComponent(args.bucket)}/objects/${key.split("/").map(encodeURIComponent).join("/")}`;
  const uploaded = await fetch(endpoint, {
    method: "PUT",
    signal: AbortSignal.timeout(30000),
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": type,
      "Content-Length": String(bytes.byteLength),
    },
    body: bytes,
  });
  if (!uploaded.ok)
    throw new Error(`R2 upload failed at item ${index + 1}: status ${uploaded.status}`);
  const verification = await fetch(endpoint, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(30000),
  });
  if (
    !verification.ok ||
    digest(new Uint8Array(await verification.arrayBuffer())) !== digest(bytes)
  )
    throw new Error(`R2 verification failed at item ${index + 1}`);
  manifest[source] = {
    accountId: args["account-id"],
    bucket: args.bucket,
    publicBase: base,
    key,
    target: `${base}/${key}`,
    bytes: bytes.byteLength,
    sha256: digest(bytes),
    verified: true,
  };
  await writeFile(`${manifestPath}.tmp`, JSON.stringify(manifest, null, 2), { mode: 0o600 });
  await rename(`${manifestPath}.tmp`, manifestPath);
  console.log(
    JSON.stringify({
      copied: index + 1,
      total: urls.length,
      bytes: bytes.byteLength,
      verified: true,
    }),
  );
}
let rewritten = sql;
for (const source of urls) rewritten = rewritten.split(source).join(manifest[source].target);
const output = sqlPath.replace(/\.data-import\.sql$/, ".r2.data-import.sql");
if (output === sqlPath) throw new Error("The input filename must end in .data-import.sql");
await writeFile(output, rewritten, { mode: 0o600 });
console.log(JSON.stringify({ verifiedAssets: urls.length, rewrittenSql: output }));
