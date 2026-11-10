import { usePostHogIdentify } from "@/hooks/use-posthog-identify";
import { Toaster } from "./ui/sonner";
export default function Providers({ children }: { children: React.ReactNode }) {
  usePostHogIdentify();
  return (
    <>
      {children}
      <Toaster richColors />
    </>
  );
}
