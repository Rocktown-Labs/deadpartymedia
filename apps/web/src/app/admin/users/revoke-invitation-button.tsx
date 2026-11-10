import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/utils/error";
import { useRouter } from "@tanstack/react-router";
import { useTransition } from "react";
import { toast } from "sonner";
import { revokeInvitation } from "./actions";

interface RevokeInvitationButtonProps {
  invitationId: string;
  email: string;
}

export function RevokeInvitationButton({ invitationId, email }: RevokeInvitationButtonProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleRevoke = () => {
    startTransition(async () => {
      try {
        const result = await revokeInvitation(invitationId);
        if (result.success) {
          toast.success(`Invitation for ${email} has been revoked.`);
          // Refresh the page to show updated invitation list
          router.invalidate();
        } else {
          toast.error(
            ("error" in result ? String(result.error) : "") || "Failed to revoke invitation.",
          );
        }
      } catch (error) {
        toast.error(getErrorMessage(error, "Failed to revoke invitation."));
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
