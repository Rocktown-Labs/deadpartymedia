"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function useUnsavedChangesGuard(isDirty: boolean, fallbackHref: Route) {
  const router = useRouter();
  const [pendingHref, setPendingHref] = useState<Route | null>(null);

  useEffect(() => {
    if (!isDirty) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const navigateAway = useCallback(
    (href: Route = fallbackHref) => {
      if (isDirty) {
        setPendingHref(href);
        return;
      }

      router.push(href);
    },
    [fallbackHref, isDirty, router],
  );

  const discardChanges = useCallback(() => {
    const href = pendingHref ?? fallbackHref;
    setPendingHref(null);
    router.push(href);
  }, [fallbackHref, pendingHref, router]);

  const UnsavedChangesDialog = (
    <Dialog open={pendingHref !== null} onOpenChange={(open) => !open && setPendingHref(null)}>
      <DialogContent className="border-zinc-800 bg-[#111111] text-white">
        <DialogHeader>
          <DialogTitle>Discard unsaved changes?</DialogTitle>
          <DialogDescription className="text-zinc-400">
            You have edits that have not been saved. Leaving now will discard those changes.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setPendingHref(null)}>
            Keep Editing
          </Button>
          <Button
            type="button"
            onClick={discardChanges}
            className="bg-[#7CFC00] text-black hover:bg-[#7CFC00]/90"
          >
            Discard Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return {
    UnsavedChangesDialog,
    navigateAway,
  };
}
