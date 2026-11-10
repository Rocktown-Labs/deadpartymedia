export const appRoles = {
  arts: ["artmaker", "fan", "arts_writer", "arts_admin", "super_admin"],
  music: ["artist", "venue", "fan", "writer", "super_admin"],
} as const;
export type Application = keyof typeof appRoles;
export function isAppRole(app: Application, role: string): boolean {
  return (appRoles[app] as readonly string[]).includes(role);
}
