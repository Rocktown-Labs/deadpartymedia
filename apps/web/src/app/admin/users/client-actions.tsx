"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import {
  updateLocalUserRole,
  updateLocalUserEmail,
  inviteUserProfile,
  deleteLocalUserProfile,
} from "./actions";
import type { Roles } from "@/types/globals";

// 1. Role Select Dropdown
export function UserRoleSelect({
  userId,
  currentRole,
  layout = "list",
}: {
  userId: number;
  currentRole: Roles;
  layout?: "list" | "detail";
}) {
  const [role, setRole] = useState<Roles>(currentRole);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleRoleChange = (newRole: string) => {
    const previousRole = role;
    const selectedRole = newRole as Roles;
    setRole(selectedRole);

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("id", String(userId));
        formData.append("role", selectedRole);

        const result = await updateLocalUserRole(formData);
        if (result.success) {
          toast.success(`Role updated to ${selectedRole} successfully.`);
          router.refresh();
        } else {
          toast.error(result.error || "Failed to update role");
          setRole(previousRole);
        }
      } catch {
        toast.error("An unexpected error occurred while updating role.");
        setRole(previousRole);
      }
    });
  };

  if (layout === "detail") {
    return (
      <div>
        <label className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wider text-gray-400">
          Role
          {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin text-red-500" />}
        </label>
        <select
          value={role}
          onChange={(e) => handleRoleChange(e.target.value)}
          disabled={isPending}
          className="h-10 min-w-[12rem] rounded-md border border-gray-800 bg-[#0A0A0A] px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-red-500 disabled:opacity-50"
        >
          <option value="writer">Writer</option>
          <option value="super_admin">Super Admin</option>
          <option value="fan">Fan</option>
          <option value="artist">Artist</option>
        </select>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={role}
        onChange={(e) => handleRoleChange(e.target.value)}
        disabled={isPending}
        className="h-8 rounded-md border border-gray-800 bg-[#0A0A0A] px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-red-500 disabled:opacity-50"
      >
        <option value="writer">Writer</option>
        <option value="super_admin">Super Admin</option>
        <option value="fan">Fan</option>
        <option value="artist">Artist</option>
      </select>
      {isPending && <Loader2 className="h-4 w-4 animate-spin text-red-500" />}
    </div>
  );
}

// 2. Email Form (for placeholder users)
export function UserEmailForm({
  userId,
  currentEmail,
  layout = "list",
}: {
  userId: number;
  currentEmail: string;
  layout?: "list" | "detail";
}) {
  const [email, setEmail] = useState(currentEmail);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.append("id", String(userId));

    startTransition(async () => {
      try {
        const result = await updateLocalUserEmail(formData);
        if (result.success) {
          toast.success("Email address updated successfully.");
          router.refresh();
        } else {
          toast.error(result.error || "Failed to update email");
        }
      } catch {
        toast.error("An unexpected error occurred while saving email.");
      }
    });
  };

  if (layout === "detail") {
    return (
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3 w-full">
        <div className="min-w-[18rem] flex-1">
          <label className="mb-1 block text-xs uppercase tracking-wider text-gray-400">Email</label>
          <Input
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-10 bg-[#0A0A0A] border-gray-800 text-sm"
            required
            disabled={isPending}
          />
        </div>
        <Button
          type="submit"
          variant="outline"
          disabled={isPending}
          className="h-10 border-gray-700"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Save Email
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2">
      <Input
        name="email"
        type="email"
        placeholder="Set real email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="h-8 min-w-[13rem] bg-[#0A0A0A] border-gray-800 text-sm"
        required
        disabled={isPending}
      />
      <Button
        type="submit"
        size="sm"
        variant="outline"
        disabled={isPending}
        className="border-gray-700"
      >
        {isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
        Save Email
      </Button>
    </form>
  );
}

// 3. Invite Button
export function InviteUserButton({
  userId,
  disabled,
  size = "sm",
  label = "Invite",
}: {
  userId: number;
  disabled: boolean;
  size?: "default" | "sm" | "lg" | "icon";
  label?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleInvite = () => {
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("id", String(userId));

        const result = await inviteUserProfile(formData);
        if (result.success) {
          toast.success("Invitation sent successfully!");
          router.refresh();
        } else {
          toast.error(result.error || "Failed to send invitation");
        }
      } catch {
        toast.error("An unexpected error occurred while sending invitation.");
      }
    });
  };

  return (
    <Button
      type="button"
      size={size}
      disabled={disabled || isPending}
      onClick={handleInvite}
      className="bg-red-500 hover:bg-red-600 text-white font-semibold disabled:opacity-50"
    >
      {isPending ? (
        <>
          <Loader2 className="h-3 w-3 animate-spin mr-1" />
          Inviting...
        </>
      ) : (
        label
      )}
    </Button>
  );
}

// 4. Delete Button
export function DeleteUserButton({
  userId,
  redirectToUsers = false,
  size = "sm",
  label = "Delete",
}: {
  userId: number;
  redirectToUsers?: boolean;
  size?: "default" | "sm" | "lg" | "icon";
  label?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleDelete = () => {
    // eslint-disable-next-line no-alert
    if (!window.confirm("Are you sure you want to delete this user profile?")) {
      return;
    }

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("id", String(userId));

        const result = await deleteLocalUserProfile(formData);
        if (result.success) {
          toast.success("User profile deleted successfully.");
          if (redirectToUsers) {
            router.push("/admin/users");
          } else {
            router.refresh();
          }
        } else {
          toast.error(result.error || "Failed to delete profile");
        }
      } catch {
        toast.error("An unexpected error occurred while deleting profile.");
      }
    });
  };

  return (
    <Button
      type="button"
      size={size}
      variant="destructive"
      disabled={isPending}
      onClick={handleDelete}
    >
      {isPending ? (
        <>
          <Loader2 className="h-3 w-3 animate-spin mr-1" />
          Deleting...
        </>
      ) : (
        label
      )}
    </Button>
  );
}
