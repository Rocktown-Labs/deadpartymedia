import { usePostHogIdentify } from "@/hooks/use-posthog-identify";
import { IdentityProvider } from "./identity-provider";
import { Toaster } from "./ui/sonner";
export default function Providers({ children }: { children: React.ReactNode }) {
  usePostHogIdentify();
  return (
    <IdentityProvider>
      {children}
      <Toaster richColors />
    </IdentityProvider>
  );
}
