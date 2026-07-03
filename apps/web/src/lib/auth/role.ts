import type { Roles } from "@/types/globals";

const VALID_ROLES: ReadonlySet<Roles> = new Set([
  "super_admin",
  "writer",
  "artist",
  "artmaker",
  "arts_admin",
  "arts_writer",
  "fan",
]);

const LEGACY_ROLE_ALIASES: Readonly<Record<string, Roles>> = {
  admin: "super_admin",
};

export function parseRole(value?: unknown): Roles | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = LEGACY_ROLE_ALIASES[value] ?? value;
  return VALID_ROLES.has(normalizedValue as Roles) ? (normalizedValue as Roles) : null;
}

export function roleOrDefault(value?: unknown, fallback: Roles = "fan"): Roles {
  return parseRole(value) ?? fallback;
}
