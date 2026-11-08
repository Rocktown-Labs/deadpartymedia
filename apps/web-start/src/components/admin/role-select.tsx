"use client";

import { useState } from "react";
import { apiPost } from "@/lib/api-client";

const ROLES = ["fan", "writer", "artist", "venue", "super_admin"] as const;

/**
 * Role select for the admin users table — posts to the API's dual-dispatch
 * role endpoint (Clerk user id here), mirroring the Next app's
 * RoleSelectForm.
 */
export function RoleSelect({ clerkId, currentRole }: { clerkId: string; currentRole: string }) {
  const [role, setRole] = useState(currentRole);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function update(nextRole: string) {
    if (nextRole === role) {
      return;
    }
    setBusy(true);
    setMessage(null);
    const result = await apiPost(`/music/admin/users/${encodeURIComponent(clerkId)}/role`, {
      role: nextRole,
    });
    setBusy(false);
    if (!result.ok) {
      setMessage(result.error ?? "Failed");
      return;
    }
    setRole(nextRole);
    setMessage("Updated ✓");
  }

  return (
    <div className="flex items-center gap-2">
      <select
        className="rounded-md border border-white/15 bg-zinc-950 px-2 py-1 text-sm text-white"
        disabled={busy}
        onChange={(event) => {
          void update(event.target.value);
        }}
        value={role}
      >
        {ROLES.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
      {message ? <span className="text-xs text-gray-500">{message}</span> : null}
    </div>
  );
}
