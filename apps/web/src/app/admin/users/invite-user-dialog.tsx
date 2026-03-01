"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { inviteUser } from "./actions";
import type { Roles } from "@/types/globals";
import { useRouter } from "next/navigation";

export function InviteUserDialog() {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Invite User</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite User</DialogTitle>
          <DialogDescription>
            Send an invitation to a new user. They will receive an email with a sign-up link.
          </DialogDescription>
        </DialogHeader>
        <form
          action={async (formData: FormData) => {
            setIsSubmitting(true);
            try {
              const email = formData.get("email") as string;
              const role = formData.get("role") as Roles;
              const result = await inviteUser(email, role);
              if (result.success) {
                setOpen(false);
                router.refresh();
              } else {
                alert(result.error || "Failed to send invitation");
              }
            } catch (error: any) {
              alert(error.message || "Failed to send invitation");
            } finally {
              setIsSubmitting(false);
            }
          }}
        >
          <div className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required className="mt-1" />
            </div>
            <div>
              <Label htmlFor="role">Role</Label>
              <Select name="role" defaultValue="fan" required>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                  <SelectItem value="writer">Writer</SelectItem>
                  <SelectItem value="artist">Artist</SelectItem>
                  <SelectItem value="fan">Fan</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Sending..." : "Send Invitation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
