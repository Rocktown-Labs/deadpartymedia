import { usePostHogIdentify } from "@/hooks/use-posthog-identify";
import { IdentityProvider } from "./identity-provider";
import { Toaster } from "./ui/sonner";
export default function Providers({
  children,
  authProviders,
}: {
  children: React.ReactNode;
  authProviders?: { google: boolean };
}) {
  usePostHogIdentify();
  return (
    <IdentityProvider authProviders={authProviders}>
      {children}
      <Toaster richColors />
    </IdentityProvider>
  );
}
