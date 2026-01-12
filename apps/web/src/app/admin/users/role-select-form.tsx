"use client";

import { useState, useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateRoleAction } from "./update-role-action";
import { type Roles } from "@/types/globals";

export function RoleSelectForm({
  userId,
  currentRole,
}: {
  userId: string;
  currentRole: string;
}) {
  const [role, setRole] = useState<Roles>(currentRole as Roles);
  const [isPending, startTransition] = useTransition();

  const handleRoleChange = (newRole: Roles) => {
    setRole(newRole);
    startTransition(async () => {
      const formData = new FormData();
      formData.append("userId", userId);
      formData.append("role", newRole);
      await updateRoleAction(formData);
    });
  };

  return (
    <Select
      value={role}
      onValueChange={handleRoleChange}
      disabled={isPending}
    >
      <SelectTrigger className="w-40">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="super_admin">Super Admin</SelectItem>
        <SelectItem value="writer">Writer</SelectItem>
        <SelectItem value="artist">Artist</SelectItem>
        <SelectItem value="fan">Fan</SelectItem>
      </SelectContent>
    </Select>
  );
}
