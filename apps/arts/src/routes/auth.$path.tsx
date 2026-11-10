import type { CSSProperties } from "react";
import { Auth } from "#/components/auth/auth";
import { emailOtpPlugin } from "#/lib/auth/email-otp-plugin";
import { viewPaths } from "@better-auth-ui/core";
import { createFileRoute, notFound, redirect, Link } from "@tanstack/react-router";
const paths = new Set(Object.values({ ...viewPaths.auth, ...emailOtpPlugin().viewPaths?.auth }));
export const Route = createFileRoute("/auth/$path")({
  beforeLoad: ({ params, location }) => {
    if (!paths.has(params.path)) throw notFound();
    const query = new URLSearchParams(location.searchStr);
    const target = query.get("redirectTo") || "";
    if (
      ["sign-in", "sign-up", "email-otp"].includes(params.path) &&
      !/^\/api\/sso\/establish\?state=[a-f0-9-]{72}$/.test(target)
    )
      throw redirect({
        href: `/api/sso/start?view=${params.path === "sign-up" ? "sign-up" : "sign-in"}`,
        reloadDocument: true,
      });
  },
  component: AuthPage,
});
function AuthPage() {
  const { path } = Route.useParams();
  const music = false;
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
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-[#7CFC00] hover:underline"
        >
          <span aria-hidden="true">←</span> Back to Dead Party Arts
        </Link>
        <img
          src={music ? "/images/dead-party-logo.png" : "/deadpartyarts-trans.png"}
          alt={music ? "Dead Party Media" : "Dead Party Arts"}
          className="mx-auto h-24 w-auto object-contain"
        />
        <p className="text-center text-sm text-muted-foreground">
          {music
            ? "Your home for Arkansas music and artists."
            : "Your home for Arkansas art and artists."}
        </p>
        <Auth path={path} className="mx-auto w-full" />
      </div>
    </div>
  );
}
