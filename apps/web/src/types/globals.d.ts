// Empty export makes this a module, required for `declare global` to work
// eslint-disable-next-line @typescript-eslint/no-useless-empty-export

// Create a type for the Roles
export type Roles =
  | "artist"
  | "artmaker"
  | "arts_admin"
  | "arts_writer"
  | "fan"
  | "super_admin"
  | "venue"
  | "writer";

declare global {
  interface CustomJwtSessionClaims {
    metadata: {
      role?: Roles;
      // For artists claiming their profile
      artistId?: number;
      // For venues claiming their profile
      venueId?: number;
      // For artmakers in the arts app
      artmakerId?: number;
      // Track if user has completed onboarding
      onboardingComplete?: boolean;
    };
  }
}
