/**
 * Ported from apps/web/src/lib/auth/clerk.ts (framework-free).
 * Structurally compatible with the @clerk/backend `User` resource.
 */

interface ClerkEmailAddress {
  id: string;
  emailAddress: string;
}

interface ClerkUserWithEmails {
  emailAddresses: ClerkEmailAddress[];
  primaryEmailAddressId: string | null;
}

export function getPrimaryEmail(user: ClerkUserWithEmails): string | null {
  const primaryEmail = user.emailAddresses.find(
    (email) => email.id === user.primaryEmailAddressId,
  )?.emailAddress;

  return primaryEmail ?? user.emailAddresses[0]?.emailAddress ?? null;
}
