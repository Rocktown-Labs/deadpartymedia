// Empty export makes this a module, required for `declare global` to work
// eslint-disable-next-line @typescript-eslint/no-useless-empty-export

// Create a type for the Roles
export type Roles = "artist" | "fan" | "super_admin" | "writer";

declare global {
  interface CustomJwtSessionClaims {
    metadata: {
      role?: Roles;
      // For artists claiming their profile
      artistId?: number;
      // Track if user has completed onboarding
      onboardingComplete?: boolean;
    };
  }
}
