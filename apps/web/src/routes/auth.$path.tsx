import type { CSSProperties } from "react";
import { Auth } from "@/components/auth/auth";
import { emailOtpPlugin } from "@/lib/auth/email-otp-plugin";
import { viewPaths } from "@better-auth-ui/core";
import { createFileRoute, notFound, useLocation } from "@tanstack/react-router";
import { useEffect } from "react";
const paths = new Set(Object.values({ ...viewPaths.auth, ...emailOtpPlugin().viewPaths?.auth }));
export const Route = createFileRoute("/auth/$path")({
  beforeLoad: ({ params }) => {
    if (!paths.has(params.path)) throw notFound();
  },
  component: AuthPage,
});
function AuthPage() {
  const { path } = Route.useParams();
  const search = useLocation({ select: (location) => location.searchStr });
  const music = true;
  useEffect(() => {
    const params = new URLSearchParams(search);
    const returnTo = params.get("redirectTo") || "/onboarding";
    window.location.replace(
      `/api/sso/start?view=${path === "sign-up" ? "sign-up" : "sign-in"}&returnTo=${encodeURIComponent(returnTo)}`,
    );
  }, [path, search]);
  return (
    <div
      className="flex min-h-[80vh] items-center justify-center px-5 py-24"
      style={
        {
          "--primary": "#7CFC00",
          "--primary-foreground": "#000",
          "--ring": "#7CFC00",
        } as CSSProperties
      }
    >
      <div className="w-full max-w-md space-y-6">
        <img
          src={music ? "/images/dead-party-logo.png" : "/deadpartyarts-trans.png"}
          alt={music ? "Dead Party Media" : "Dead Party Arts"}
          className="mx-auto h-24 w-auto object-contain"
        />
        <p className="text-center text-sm text-muted-foreground">
          Your home for Arkansas music and artists.
        </p>
        <Auth path={path} className="mx-auto w-full" />
      </div>
    </div>
  );
}
