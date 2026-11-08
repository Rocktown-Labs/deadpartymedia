import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { apiPost } from "../lib/api-client";

const ROLES = ["fan", "writer", "artist", "venue", "super_admin"] as const;

/**
 * User invitation form — ported from the admin users page's invite flow.
 * Posts to the API's Clerk invitation endpoint (super_admin only).
 */
export const Route = createFileRoute("/admin/invitations/new")({
  component: InvitePage,
  head: () => ({ meta: [{ title: "Invite User | Dead Party Media" }] }),
});

function InvitePage() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("fan");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function invite() {
    if (!email) {
      return;
    }
    setBusy(true);
    setMessage(null);
    const result = await apiPost("/music/admin/invitations", { email, role });
    setBusy(false);
    if (!result.ok) {
      setMessage((result as { error?: string }).error ?? "Failed to invite");
      return;
    }
    setMessage("Invitation sent ✓");
    setEmail("");
  }

  return (
    <main className="mx-auto max-w-2xl px-6 pt-28 pb-20">
      <h1 className="mb-6 text-3xl font-black">Invite User</h1>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-gray-300">Email</Label>
          <Input
            onChange={(event) => {
              setEmail(event.target.value);
            }}
            placeholder="user@example.com"
            type="email"
            value={email}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-gray-300">Role</Label>
          <Select
            onValueChange={(value) => {
              setRole(value);
            }}
            value={role}
          >
            <SelectTrigger>{role}</SelectTrigger>
            <SelectContent>
              {ROLES.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {message ? <p className="text-sm text-gray-400">{message}</p> : null}
        <Button
          className="bg-[#7CFC00] text-black hover:bg-[#7CFC00]/90"
          disabled={busy || !email}
          onClick={() => {
            void invite();
          }}
          type="button"
        >
          {busy ? "Inviting…" : "Send invitation"}
        </Button>
      </div>
    </main>
  );
}
