"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { inviteArtistToClaim } from "./actions";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/utils/error";

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
          toast.error(result.error || "Failed to send invitation.");
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
