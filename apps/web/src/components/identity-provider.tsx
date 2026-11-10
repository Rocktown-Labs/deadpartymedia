import { AuthProvider } from "@/components/auth/auth-provider";
import { authClient } from "@/lib/auth-client";
import { emailOtpPlugin } from "@/lib/auth/email-otp-plugin";
import { createMusicClient, readResponse } from "@dpmedia/api-client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useRouter } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

export function IdentityProvider({
  children,
  authProviders,
}: {
  children: ReactNode;
  authProviders?: { google: boolean };
}) {
  const queryClient = useQueryClient();
  const router = useRouter();
  useEffect(() => {
    const refresh = () => {
      void router.invalidate();
    };
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [router]);
  const pathname = useLocation({ select: (location) => location.pathname });
  const search = useLocation({ select: (location) => location.searchStr });
  const parameters = new URLSearchParams(search);
  const requested = parameters.get("redirectTo");
  const redirectTo =
    requested?.startsWith("/") && !requested.startsWith("//") && !/[\\\r\n]/.test(requested)
      ? requested
      : pathname.startsWith("/invitation/")
        ? pathname
        : "/onboarding";
  const brand = parameters.get("brand");
  const { data: providers } = useQuery({
    queryKey: ["identity", "providers"],
    initialData: authProviders,
    staleTime: 60000,
    queryFn: async () =>
      readResponse(await createMusicClient("/api/rpc/music").auth.providers.$get()),
  });
  return (
    <AuthProvider
      authClient={authClient}
      queryClient={queryClient}
      redirectTo={redirectTo}
      emailAndPassword={{ requireEmailVerification: true }}
      socialProviders={providers?.google ? ["google"] : []}
      plugins={[emailOtpPlugin({ signIn: true, emailVerification: true })]}
      navigate={({ to, replace }) => {
        const target = new URL(to, window.location.origin);
        if (target.origin !== window.location.origin) return;
        if (target.pathname.startsWith("/auth/")) {
          if (!target.searchParams.has("redirectTo"))
            target.searchParams.set("redirectTo", redirectTo);
          if (brand) target.searchParams.set("brand", brand);
        }
        if (replace) window.location.replace(target.href);
        else window.location.assign(target.href);
      }}
      Link={({ href, ...props }) => {
        const target = new URL(href, "https://local.invalid");
        if (target.pathname.startsWith("/auth/")) {
          target.searchParams.set("redirectTo", redirectTo);
          if (brand) target.searchParams.set("brand", brand);
        }
        return <Link to={target.pathname + target.search + target.hash} {...props} />;
      }}
    >
      {children}
    </AuthProvider>
  );
}
