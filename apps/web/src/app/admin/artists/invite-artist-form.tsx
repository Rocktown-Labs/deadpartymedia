import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/utils/error";
import { useTransition } from "react";
import { toast } from "sonner";
import { inviteArtistToClaim } from "./actions";

interface InviteArtistFormProps {
  artistId: number;
  email: string;
}

export function InviteArtistForm({ artistId, email }: InviteArtistFormProps) {
  const [isPending, startTransition] = useTransition();

  const handleInvite = () => {
    startTransition(async () => {
      try {
        const result = await inviteArtistToClaim(artistId, email);
        if (result.success) {
          toast.success(`Invitation sent to ${email} to claim profile!`);
        } else {
          toast.error(
            ("error" in result ? String(result.error) : "") || "Failed to send invitation.",
          );
        }
      } catch (error) {
        toast.error(getErrorMessage(error, "Failed to send invitation."));
      }
    });
  };

  return (
    <Button type="button" variant="outline" size="sm" onClick={handleInvite} disabled={isPending}>
      {isPending ? "Sending..." : "Resend Invite"}
    </Button>
  );
}
