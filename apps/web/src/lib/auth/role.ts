import type { Roles } from "@/types/globals";

const VALID_ROLES: ReadonlySet<Roles> = new Set([
  "super_admin",
  "writer",
  "artist",
  "venue",
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

export const WEB_ROLES: readonly Roles[] = [
  "super_admin",
  "writer",
  "artist",
  "venue",
  "fan",
] as const;

export const ARTS_ROLES: readonly Roles[] = ["arts_admin", "arts_writer", "artmaker"] as const;

export function isWebRole(role: unknown): role is (typeof WEB_ROLES)[number] {
  const parsed = parseRole(role);
  return parsed !== null && (WEB_ROLES as readonly string[]).includes(parsed);
}

export function isArtsRole(role: unknown): role is (typeof ARTS_ROLES)[number] {
  const parsed = parseRole(role);
  return parsed !== null && (ARTS_ROLES as readonly string[]).includes(parsed);
}
