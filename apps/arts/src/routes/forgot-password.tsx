import { createFileRoute } from "@tanstack/react-router";
import { Auth } from "#/components/auth/auth";
export const Route = createFileRoute("/forgot-password")({
  component: () => (
    <div className="mx-auto w-full max-w-md px-5 py-28">
      <Auth view="forgotPassword" />
    </div>
  ),
});
