import { parse } from "csv-parse/sync";
import { z } from "zod";
import { appRoles, type Application } from "./roles";

const exportRow = z.object({
  id: z.string().min(1),
  primary_email_address: z.email(),
  first_name: z.string().default(""),
  last_name: z.string().default(""),
  verified_email_addresses: z.string().default(""),
  password_digest: z.string().default(""),
  password_hasher: z.string().default(""),
  totp_secret: z.string().default(""),
});
const clerkUser = z.object({
  id: z.string(),
  image_url: z.string().nullish(),
  created_at: z.number(),
  updated_at: z.number(),
  password_enabled: z.boolean().optional(),
  banned: z.boolean().optional(),
  locked: z.boolean().optional(),
  totp_enabled: z.boolean().optional(),
  two_factor_enabled: z.boolean().optional(),
  public_metadata: z
    .object({ role: z.string().optional(), roles: z.array(z.string()).optional() })
    .passthrough(),
  external_accounts: z
    .array(
      z.object({
        provider: z.string(),
        provider_user_id: z.string(),
        approved_scopes: z.string().nullish(),
      }),
    )
    .default([]),
});
const scopedRoles = z.object({
  arts: z.array(z.enum(appRoles.arts)).default([]),
  music: z.array(z.enum(appRoles.music)).default([]),
});
const reservedIdentity = z.object({
  id: z.string().regex(/^(wp_placeholder:|local_placeholder:).+/),
  email: z.email().transform((email) => email.toLowerCase()),
  name: z.string().min(1),
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
  memberships: scopedRoles,
});
const sqlValue = (value: string | number | null) =>
  value === null
    ? "NULL"
    : typeof value === "number"
      ? String(value)
      : `'${value.replaceAll("'", "''")}'`;
function insert(table: string, values: Record<string, string | number | null>, conflict: string) {
  return `INSERT INTO ${table} (${Object.keys(values).join(", ")}) VALUES (${Object.values(values).map(sqlValue).join(", ")}) ON CONFLICT (${conflict}) DO NOTHING;`;
}
/** Pure planning step. It never contacts Clerk, applies SQL, or prints credentials. */
export function planClerkImport(
  csv: string,
  apiSnapshot: unknown,
  apps: Application[],
  scopedMemberships?: unknown,
  reservedIdentities: unknown = [],
) {
  const scoped =
    scopedMemberships === undefined
      ? undefined
      : z.record(z.string(), scopedRoles).parse(scopedMemberships);
  const reserved = z.array(reservedIdentity).parse(reservedIdentities);
  if (apps.length > 1 && !scoped)
    throw new Error(
      "Migrating both apps requires an explicit per-user membership map; legacy global roles cannot grant access to both apps implicitly",
    );
  const rows = z
    .array(exportRow)
    .parse(parse(csv, { columns: true, skip_empty_lines: true, bom: true }));
  const snapshot = z.array(clerkUser).parse(apiSnapshot);
  const users = new Map(snapshot.map((user) => [user.id, user]));
  if (users.size !== snapshot.length || new Set(rows.map((row) => row.id)).size !== rows.length)
    throw new Error("Duplicate Clerk user IDs");
  const statements: string[] = [];
  let credentials = 0,
    oauth = 0,
    memberships = 0;
  for (const row of rows) {
    if (scoped && !scoped[row.id]) throw new Error(`Scoped membership map missing for ${row.id}`);
    const user = users.get(row.id);
    if (!user) throw new Error(`Clerk metadata missing for ${row.id}`);
    if (row.totp_secret || user.two_factor_enabled || user.totp_enabled)
      throw new Error(
        `MFA export requires an explicit two-factor migration for ${row.id}; refusing to downgrade authentication`,
      );
    if (
      row.password_digest &&
      (!/^\$2[aby]\$/.test(row.password_digest) ||
        !["bcrypt", "bcrypt_sha256", ""].includes(row.password_hasher))
    )
      throw new Error(`Unsupported password format for ${row.id}`);
    if (row.password_hasher === "bcrypt_sha256")
      throw new Error(`bcrypt_sha256 requires a distinct verifier for ${row.id}`);
    if (user.password_enabled && !row.password_digest)
      throw new Error(`Password digest missing for ${row.id}; export it from Clerk before cutover`);
    const email = row.primary_email_address.toLowerCase();
    statements.push(
      insert(
        "auth_user",
        {
          id: row.id,
          name: [row.first_name, row.last_name].filter(Boolean).join(" ") || email,
          email,
          email_verified: Number(
            row.verified_email_addresses
              .split(/[,;]/)
              .map((value) => value.trim().toLowerCase())
              .includes(email),
          ),
          image: user.image_url ?? null,
          disabled: Number(Boolean(user.banned || user.locked)),
          created_at: user.created_at,
          updated_at: user.updated_at,
        },
        "id",
      ),
    );
    if (row.password_digest) {
      credentials++;
      statements.push(
        insert(
          "auth_account",
          {
            id: `clerk-credential:${row.id}`,
            user_id: row.id,
            account_id: row.id,
            provider_id: "credential",
            password: row.password_digest,
            created_at: user.created_at,
            updated_at: user.updated_at,
          },
          "id",
        ),
      );
    }
    for (const external of user.external_accounts) {
      const provider = external.provider.replace(/^oauth_/, "");
      if (provider !== "google")
        throw new Error(
          `Unsupported external provider ${provider}; configure it before importing ${row.id}`,
        );
      oauth++;
      statements.push(
        insert(
          "auth_account",
          {
            id: `clerk-oauth:${row.id}:${provider}:${external.provider_user_id}`,
            user_id: row.id,
            account_id: external.provider_user_id,
            provider_id: provider,
            scope: external.approved_scopes ?? null,
            created_at: user.created_at,
            updated_at: user.updated_at,
          },
          "id",
        ),
      );
    }
    const roles = new Set(
      [user.public_metadata.role, ...(user.public_metadata.roles ?? [])]
        .filter((role): role is string => Boolean(role))
        .map((role) => (role === "admin" ? "super_admin" : role)),
    );
    if (scoped) {
      for (const role of roles) {
        const applicable = apps.filter((app) =>
          (appRoles[app] as readonly string[]).includes(role),
        );
        if (!applicable.length) continue;
        if (
          !applicable.some((app) =>
            (scoped[row.id]?.[app] ?? []).some((assigned) => assigned === role),
          )
        )
          throw new Error(`Scoped membership map drops Clerk role ${role} for ${row.id}`);
      }
    }
    for (const app of apps)
      for (const role of scoped ? (scoped[row.id]?.[app] ?? []) : roles) {
        if (!(appRoles[app] as readonly string[]).includes(role)) continue;
        statements.push(
          insert(
            "app_membership",
            { user_id: row.id, app, role, created_at: user.created_at },
            "user_id, app, role",
          ),
        );
        memberships++;
      }
  }
  const identityIds = new Set(rows.map((row) => row.id));
  const identityEmails = new Set(rows.map((row) => row.primary_email_address.toLowerCase()));
  for (const identity of reserved) {
    if (identityIds.has(identity.id) || identityEmails.has(identity.email))
      throw new Error("Reserved identity conflicts with another imported ID or email");
    identityIds.add(identity.id);
    identityEmails.add(identity.email);
    statements.push(
      insert(
        "auth_user",
        {
          id: identity.id,
          email: identity.email,
          name: identity.name,
          email_verified: 0,
          disabled: 0,
          created_at: identity.createdAt,
          updated_at: identity.updatedAt,
        },
        "id",
      ),
    );
    for (const app of apps) {
      for (const role of new Set(identity.memberships[app])) {
        statements.push(
          insert(
            "app_membership",
            {
              user_id: identity.id,
              app,
              role,
              created_at: identity.createdAt,
            },
            "user_id, app, role",
          ),
        );
        memberships++;
      }
    }
  }
  return {
    summary: { users: rows.length + reserved.length, credentials, oauth, memberships },
    sql: statements.join("\n") + "\n",
  };
}
