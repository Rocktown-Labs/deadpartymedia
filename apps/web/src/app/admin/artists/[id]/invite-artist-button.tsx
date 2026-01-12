"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { inviteArtistToClaim } from "../actions";
import { toast } from "sonner";

interface InviteArtistButtonProps {
  artistId: number;
  email: string;
}

export function InviteArtistButton({ artistId, email }: InviteArtistButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleInvite = async () => {
    startTransition(async () => {
      try {
        const result = await inviteArtistToClaim(artistId, email);
        if (result.success) {
          toast.success(`Invitation sent to ${email} to claim profile!`);
        } else {
          toast.error(result.error || "Failed to send invitation.");
        }
      } catch (error: any) {
        toast.error(error.message || "Failed to send invitation.");
      }
    });
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleInvite}
      disabled={isPending}
    >
      {isPending ? "Sending..." : "Resend Invitation"}
    </Button>
  );
}
