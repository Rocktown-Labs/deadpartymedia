import { ClerkProvider } from "@clerk/tanstack-react-start";

export default function AppClerkProvider({ children }: { children: React.ReactNode }) {
  const publishableKey =
    import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || import.meta.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  return <ClerkProvider publishableKey={publishableKey}>{children}</ClerkProvider>;
}
