import { roleEnumValues } from "@dpmedia/db/d1/schema";

/**
 * Arts role model, ported from apps/arts/src/lib/roles.ts.
 *
 * A user can hold at most one "audience" role (what they do on the site) plus
 * at most one staff role (what they can administer). This lets an artmaker
 * also be an arts admin without the two systems fighting over a single Clerk
 * metadata field (issue #92).
 *
 * Differences from apps/api/src/auth.ts#getRolesFromMetadata (which reads JWT
 * claims and maps the legacy "admin" alias to super_admin): the helpers here
 * read Clerk public metadata records verbatim, the way the arts server
 * functions did, so onboarding role merges keep writing back what they read.
 */

export const ARTS_AUDIENCE_ROLES = ["artist", "artmaker", "fan"] as const;

// Note: "writer" is the music-site writer role and is deliberately NOT arts
// staff (see apps/arts __tests__/unit/lib/roles.test.ts).
export const ARTS_STAFF_ROLES = ["admin", "arts_admin", "arts_writer", "super_admin"] as const;

export type ArtsAudienceRole = (typeof ARTS_AUDIENCE_ROLES)[number];
export type ArtsStaffRole = (typeof ARTS_STAFF_ROLES)[number];

export function isArtsAudienceRole(role: unknown): role is ArtsAudienceRole {
  return typeof role === "string" && (ARTS_AUDIENCE_ROLES as readonly string[]).includes(role);
}

export function isArtsStaffRole(role: unknown): role is ArtsStaffRole {
  return typeof role === "string" && (ARTS_STAFF_ROLES as readonly string[]).includes(role);
}

export const ARTS_ADMIN_ROLES = ["admin", "arts_admin", "super_admin"] as const;
export type ArtsAdminRole = (typeof ARTS_ADMIN_ROLES)[number];

export function isArtsAdminRole(role: unknown): role is ArtsAdminRole {
  return typeof role === "string" && (ARTS_ADMIN_ROLES as readonly string[]).includes(role);
}

export const ARTS_PLATFORM_ROLES = [
  "super_admin",
  "arts_admin",
  "arts_writer",
  "artmaker",
] as const;

export type ArtsPlatformRole = (typeof ARTS_PLATFORM_ROLES)[number];

export function isArtsPlatformRole(role: unknown): role is ArtsPlatformRole {
  return typeof role === "string" && (ARTS_PLATFORM_ROLES as readonly string[]).includes(role);
}

interface RoleMetadata {
  role?: unknown;
  roles?: unknown;
}

/**
 * Collect every role a user holds from Clerk public metadata.
 *
 * Reads the `roles` array first, then falls back to the legacy single `role`
 * string so existing accounts keep working before a migration.
 */
export function getRolesFromMetadata(metadata: RoleMetadata | null | undefined): string[] {
  const roles = new Set<string>();

  if (Array.isArray(metadata?.roles)) {
    for (const item of metadata.roles) {
      if (typeof item === "string" && item) {
        roles.add(item);
      }
    }
  }

  if (typeof metadata?.role === "string" && metadata.role) {
    roles.add(metadata.role);
  }

  return [...roles];
}

export function hasArtsStaffRole(roles: string[]) {
  return roles.some((role) => isArtsStaffRole(role));
}

/**
 * Staff-only users belong in the admin desk. Users who are both staff and
 * artmakers get access to both areas (issue #92).
 * super_admin has omni-access across all dashboards (issue #123).
 */
export function shouldRedirectStaffFromArtmakerDashboard(roles: string[]): boolean {
  return hasArtsStaffRole(roles) && !roles.includes("super_admin") && !roles.includes("artmaker");
}

/**
 * Merge a new role into an existing role list. The new role replaces the
 * slot it belongs to (audience or staff) and keeps the other slot intact,
 * so granting a staff role never strips someone's artmaker status and
 * onboarding as an artmaker never wipes a staff role.
 */
export function mergeArtsRole(existingRoles: string[], newRole: string): string[] {
  const replacement = isArtsStaffRole(newRole)
    ? existingRoles.filter((role) => !isArtsStaffRole(role))
    : existingRoles.filter((role) => !isArtsAudienceRole(role));

  return [...new Set([newRole, ...replacement])];
}

type DbUserRole = (typeof roleEnumValues)[number];

/**
 * Map a Clerk role to the shared DB role enum. "admin" is a legacy web-app
 * role with no value in the enum; super_admin is the equivalent superuser.
 * Ported from apps/arts/src/lib/artmakers.functions.ts.
 */
export function toDbUserRole(role: string): DbUserRole {
  if (role === "admin") {
    return "super_admin";
  }

  return (roleEnumValues as readonly string[]).includes(role) ? (role as DbUserRole) : "fan";
}
