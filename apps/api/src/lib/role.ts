import { roleEnumValues } from "@dpmedia/db/schema";

/**
 * Ported from apps/web/src/lib/auth/role.ts. `Roles` mirrors apps/web's
 * union type, derived from the DB role enum so the two cannot drift.
 */
export type Roles = (typeof roleEnumValues)[number];

const VALID_ROLES: ReadonlySet<string> = new Set(roleEnumValues);

const LEGACY_ROLE_ALIASES: Readonly<Record<string, string>> = {
  admin: "super_admin",
};

export function parseRole(value?: unknown): Roles | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = LEGACY_ROLE_ALIASES[value] ?? value;
  return VALID_ROLES.has(normalizedValue) ? (normalizedValue as Roles) : null;
}

export function roleOrDefault(value?: unknown, fallback: Roles = "fan"): Roles {
  return parseRole(value) ?? fallback;
}
