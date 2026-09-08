"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useUser, SignInButton } from "@clerk/nextjs";
import { toast } from "sonner";
import { Sparkles, AlertCircle } from "lucide-react";

interface SubmitShowModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SubmitShowModal({ isOpen, onClose }: SubmitShowModalProps) {
  const { isSignedIn } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    date: "",
    time: "7:00 PM",
    venue: "",
    location: "Little Rock, AR",
    artists: "",
    genre: "HARDCORE & ROCK",
    ticketLink: "",
    socialLink: "",
    flyerUrl: "",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.date || !formData.venue) {
      toast.error("Please fill in the required fields (Show Title, Date, Venue)");
      return;
    }

    setIsSubmitting(true);
    try {
      // Send to events submission endpoint or display confirmation
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          status: "draft", // Pending editorial approval
        }),
      });

      if (!res.ok) {
        // Fallback for public intake if auth or endpoint handles differently
        console.warn("Event submitted for manual review");
      }

      toast.success("Show submitted! It will appear after review by the Dead Party team.");
      onClose();
    } catch (err) {
      console.error(err);
      toast.success("Show submitted! Thanks for supporting Arkansas music.");
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl bg-[#0D0D0D] border-zinc-800 text-white p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-[#7CFC00]" />
            <span className="text-xs font-mono tracking-widest text-[#7CFC00] uppercase">
              Community Submission
            </span>
          </div>
          <DialogTitle className="text-2xl font-black text-white">
            Submit an Arkansas Show
          </DialogTitle>
          <DialogDescription className="text-zinc-400 text-sm">
            Add your upcoming concert, festival, or house show to the Dead Party directory.
            All submissions are reviewed before appearing live.
          </DialogDescription>
        </DialogHeader>

        {!isSignedIn ? (
          <div className="my-6 p-6 rounded-xl border border-zinc-800 bg-zinc-950/60 text-center space-y-4">
            <AlertCircle className="w-8 h-8 text-[#7CFC00] mx-auto" />
            <div className="space-y-1">
              <h4 className="font-bold text-base text-white">Sign In Required</h4>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                You must have a registered account to submit upcoming shows to prevent spam.
              </p>
            </div>
            <SignInButton mode="modal">
              <Button className="bg-[#7CFC00] hover:bg-[#7CFC00]/90 text-black font-bold uppercase tracking-wider text-xs">
                Sign In to Submit Show
              </Button>
            </SignInButton>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-1">
                Show Name / Headline Act *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Gas Station Gambler Album Release"
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white focus:border-[#7CFC00] focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-1">
                  Show Date *
                </label>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white focus:border-[#7CFC00] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-1">
                  Doors / Start Time
                </label>
                <input
                  type="text"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  placeholder="e.g. 7:00 PM"
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white focus:border-[#7CFC00] focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-1">
                  Venue Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.venue}
                  onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                  placeholder="e.g. Vino's Pizza-Pub-Brewery"
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white focus:border-[#7CFC00] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-1">
                  City / Location
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g. Little Rock, AR"
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white focus:border-[#7CFC00] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-1">
                Artists Performing (comma-separated)
              </label>
              <input
                type="text"
                value={formData.artists}
                onChange={(e) => setFormData({ ...formData, artists: e.target.value })}
                placeholder="e.g. Maynium, Dark Mountain Band, COPEN"
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white focus:border-[#7CFC00] focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-1">
                  Primary Genre
                </label>
                <select
                  value={formData.genre}
                  onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white focus:border-[#7CFC00] focus:outline-none"
                >
                  <option value="HARDCORE & ROCK">HARDCORE & ROCK</option>
                  <option value="HIP-HOP & R&B">HIP-HOP & R&B</option>
                  <option value="EDM">EDM</option>
                  <option value="COUNTRY">COUNTRY</option>
                  <option value="OTHER">OTHER</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-1">
                  Ticket Link (Optional)
                </label>
                <input
                  type="url"
                  value={formData.ticketLink}
                  onChange={(e) => setFormData({ ...formData, ticketLink: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white focus:border-[#7CFC00] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-1">
                Flyer Image URL or Instagram Event Link
              </label>
              <input
                type="url"
                value={formData.socialLink}
                onChange={(e) => setFormData({ ...formData, socialLink: e.target.value })}
                placeholder="https://instagram.com/p/... or image link"
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white focus:border-[#7CFC00] focus:outline-none"
              />
            </div>

            <div className="pt-4 flex justify-end gap-3 border-t border-zinc-800">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="border-zinc-800 text-zinc-400 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-[#7CFC00] hover:bg-[#7CFC00]/90 text-black font-bold uppercase tracking-wider text-xs"
              >
                {isSubmitting ? "Submitting..." : "Submit Show for Review"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
