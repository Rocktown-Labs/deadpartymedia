"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { revokeInvitation } from "./actions";
import { toast } from "sonner";

interface RevokeInvitationButtonProps {
  invitationId: string;
  email: string;
}

export function RevokeInvitationButton({
  invitationId,
  email,
}: RevokeInvitationButtonProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleRevoke = async () => {
    startTransition(async () => {
      try {
        const result = await revokeInvitation(invitationId);
        if (result.success) {
          toast.success(`Invitation for ${email} has been revoked.`);
          router.refresh(); // Refresh the page to show updated invitation list
        } else {
          toast.error(result.error || "Failed to revoke invitation.");
        }
      } catch (error: any) {
        toast.error(error.message || "Failed to revoke invitation.");
      }
    });
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleRevoke}
      disabled={isPending}
      className="text-red-500 hover:text-red-400"
    >
      {isPending ? "Revoking..." : "Revoke"}
    </Button>
  );
}
