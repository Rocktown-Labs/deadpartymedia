import { ArtsAuthModal } from "#/components/auth-modal";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useRouter } from "@tanstack/react-router";
import { createArtsClient, readResponse } from "@dpmedia/api-client";
import { useEffect, type ReactNode } from "react";
import { AuthProvider } from "#/components/auth/auth-provider";
import { authClient } from "#/lib/auth-client";
import { emailOtpPlugin } from "#/lib/auth/email-otp-plugin";

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
    queryFn: async () => readResponse(await createArtsClient("/api/arts").auth.providers.$get()),
  });
  const modal = parameters.has("auth");
  const backTo = parameters.get("backTo") || "/";
  const authLocation = (href: string) => {
    const target = new URL(href, "https://local.invalid");
    if (target.pathname.startsWith("/auth/")) {
      target.searchParams.set("redirectTo", redirectTo);
      if (brand) target.searchParams.set("brand", brand);
      if (modal) {
        const parent = new URL(backTo, "https://local.invalid");
        for (const [key, value] of target.searchParams) parent.searchParams.set(key, value);
        parent.searchParams.set("auth", target.pathname.slice("/auth/".length));
        parent.searchParams.set("backTo", backTo);
        return parent.pathname + parent.search + parent.hash;
      }
    }
    return target.pathname + target.search + target.hash;
  };
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
        const path = authLocation(to);
        if (modal && target.pathname.startsWith("/auth/")) {
          void router.navigate({ to: path, replace });
          return;
        }
        if (replace) window.location.replace(path);
        else window.location.assign(path);
      }}
      Link={({ href, ...props }) => <Link to={authLocation(href)} {...props} />}
    >
      {children}
      <ArtsAuthModal />
    </AuthProvider>
  );
}
