import { useQueryClient } from "@tanstack/react-query";
import { useState, useTransition } from "react";
import { useRouter } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { resendInvitation, revokeInvitation } from "./actions";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/utils/error";
import { Check, Copy, RotateCw, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface RevokeInvitationButtonProps {
  invitationId: string;
  email: string;
  url?: string | null;
}

export function RevokeInvitationButton({ invitationId, email, url }: RevokeInvitationButtonProps) {
  const queryClient = useQueryClient();
  const [isRevoking, startRevokeTransition] = useTransition();
  const [isResending, startResendTransition] = useTransition();
  const [activeUrl, setActiveUrl] = useState<string | null | undefined>(
    url || queryClient.getQueryData<string>(["music", "invitation-link", invitationId]),
  );
  const [hasCopied, setHasCopied] = useState(false);
  const router = useRouter();

  const isBusy = isRevoking || isResending;

  const handleCopyLink = async () => {
    if (!activeUrl) {
      toast.error("Direct invitation link is not available for this record.");
      return;
    }
    try {
      await navigator.clipboard.writeText(activeUrl);
      setHasCopied(true);
      toast.success(`Invitation link for ${email} copied to clipboard!`);
      setTimeout(() => setHasCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link to clipboard.");
    }
  };

  const handleResend = () => {
    startResendTransition(async () => {
      try {
        const result = await resendInvitation(invitationId, email);
        if (result?.success) {
          if (result.url) {
            setActiveUrl(result.url);
            queryClient.setQueryData(["music", "invitation-link", result.id], result.url);
          }
          toast.success(`Invitation resent to ${email}`);
          router.invalidate();
        } else {
          toast.error(
            (result && "error" in result ? String(result.error) : "") ||
              "Failed to resend invitation.",
          );
        }
      } catch (error) {
        toast.error(getErrorMessage(error, "Failed to resend invitation."));
      }
    });
  };

  const handleRevoke = () => {
    startRevokeTransition(async () => {
      try {
        const result = await revokeInvitation(invitationId);
        if (result?.success) {
          toast.success(`Invitation for ${email} has been revoked.`);
          router.invalidate();
        } else {
          toast.error(
            (result && "error" in result ? String(result.error) : "") ||
              "Failed to revoke invitation.",
          );
        }
      } catch (error) {
        toast.error(getErrorMessage(error, "Failed to revoke invitation."));
      }
    });
  };

  return (
    <div className="flex items-center gap-2">
      {activeUrl && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleCopyLink}
          disabled={isBusy}
          className="border-gray-700 bg-transparent text-xs text-gray-300 hover:border-gray-600 hover:bg-[#1A1A1A] hover:text-white"
          title="Copy direct invite link"
        >
          {hasCopied ? (
            <Check className="mr-1 h-3.5 w-3.5 text-green-400" />
          ) : (
            <Copy className="mr-1 h-3.5 w-3.5" />
          )}
          {hasCopied ? "Copied" : "Copy Link"}
        </Button>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleResend}
        disabled={isBusy}
        className="border-gray-700 bg-transparent text-xs text-[#7CFC00] hover:border-gray-600 hover:bg-[#1A1A1A] hover:text-[#7CFC00]/90"
        title="Resend invitation email"
      >
        <RotateCw className={cn("mr-1 h-3.5 w-3.5", isResending && "animate-spin")} />
        {isResending ? "Resending..." : "Resend"}
      </Button>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleRevoke}
        disabled={isBusy}
        className="border-gray-700 bg-transparent text-xs text-red-500 hover:border-gray-600 hover:bg-[#1A1A1A] hover:text-red-400"
        title="Revoke invitation"
      >
        <Trash2 className="mr-1 h-3.5 w-3.5" />
        {isRevoking ? "Revoking..." : "Revoke"}
      </Button>
    </div>
  );
}

export const PendingInvitationActions = RevokeInvitationButton;
