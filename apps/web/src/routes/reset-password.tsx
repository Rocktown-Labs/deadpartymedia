import { Auth } from "@/components/auth/auth";
import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/reset-password")({
  component: () => (
    <div className="mx-auto w-full max-w-md px-5 py-28">
      <Auth view="resetPassword" />
    </div>
  ),
});
