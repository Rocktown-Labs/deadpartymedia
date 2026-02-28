"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useFormStatus } from "react-dom";

interface DeleteConfirmProps {
  action: (formData: FormData) => void | Promise<unknown>;
  title: string;
  description?: string;
  trigger?: React.ReactNode;
}

function ConfirmDeleteButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant="destructive" disabled={pending}>
      {pending ? "Deleting..." : "Delete"}
    </Button>
  );
}

export function DeleteConfirm({
  action,
  title,
  description = "This action cannot be undone.",
  trigger,
}: DeleteConfirmProps) {
  const [open, setOpen] = useState(false);
  const handleSubmit = async (formData: FormData) => {
    await action(formData);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="text-red-500 hover:text-red-400">
            Delete
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <form action={handleSubmit}>
            <ConfirmDeleteButton />
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
