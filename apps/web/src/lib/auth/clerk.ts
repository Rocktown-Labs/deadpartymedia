type ClerkEmailAddress = {
  id: string;
  emailAddress: string;
};

type ClerkUserWithEmails = {
  emailAddresses: ClerkEmailAddress[];
  primaryEmailAddressId: string | null;
};

export function getPrimaryEmail(user: ClerkUserWithEmails): string | null {
  const primaryEmail = user.emailAddresses.find(
    (email) => email.id === user.primaryEmailAddressId,
  )?.emailAddress;

  return primaryEmail ?? user.emailAddresses[0]?.emailAddress ?? null;
}
