"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";
import { Check, X, Disc, ExternalLink, Pencil, Music, Calendar, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { approveMusicSubmission, declineMusicSubmission } from "../actions";

export interface SubmissionItem {
  id: number;
  title: string;
  slug: string;
  artistName: string;
  releaseType: string;
  genre: string;
  releaseDate: string | null;
  coverArt: string | null;
  audioUrl: string | null;
  excerpt: string | null;
  spotifyUrl: string | null;
  appleMusicUrl: string | null;
  bandcampUrl: string | null;
  youtubeUrl: string | null;
  submissionStatus: string;
  declineReason: string | null;
  createdAt: string;
}

interface SubmissionsClientProps {
  initialSubmissions: SubmissionItem[];
}

export function SubmissionsClient({ initialSubmissions }: SubmissionsClientProps) {
  const [submissions, setSubmissions] = useState<SubmissionItem[]>(initialSubmissions);
  const [activeFilter, setActiveFilter] = useState<"all" | "pending" | "approved" | "declined">(
    "pending",
  );
  const [isPending, startTransition] = useTransition();

  // Dialog state for declining
  const [declineDialogOpen, setDeclineDialogOpen] = useState(false);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<number | null>(null);
  const [declineReason, setDeclineReason] = useState("");

  const filteredSubmissions = submissions.filter((item) => {
    if (activeFilter === "all") return true;
    return item.submissionStatus === activeFilter;
  });

  const pendingCount = submissions.filter((s) => s.submissionStatus === "pending").length;
  const approvedCount = submissions.filter((s) => s.submissionStatus === "approved").length;
  const declinedCount = submissions.filter((s) => s.submissionStatus === "declined").length;

  const handleApprove = (id: number) => {
    startTransition(async () => {
      try {
        await approveMusicSubmission(id);
        setSubmissions((prev) =>
          prev.map((item) => (item.id === id ? { ...item, submissionStatus: "approved" } : item)),
        );
        toast.success("Release approved and published!");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to approve release");
      }
    });
  };

  const handleOpenDecline = (id: number) => {
    setSelectedSubmissionId(id);
    setDeclineReason("");
    setDeclineDialogOpen(true);
  };

  const handleConfirmDecline = () => {
    if (!selectedSubmissionId) return;

    startTransition(async () => {
      try {
        await declineMusicSubmission(selectedSubmissionId, declineReason);
        setSubmissions((prev) =>
          prev.map((item) =>
            item.id === selectedSubmissionId
              ? { ...item, submissionStatus: "declined", declineReason }
              : item,
          ),
        );
        setDeclineDialogOpen(false);
        toast.info("Submission declined");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to decline release");
      }
    });
  };

  return (
    <div>
      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          type="button"
          onClick={() => setActiveFilter("pending")}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition ${
            activeFilter === "pending"
              ? "bg-[#7CFC00] text-black"
              : "bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"
          }`}
        >
          Pending ({pendingCount})
        </button>
        <button
          type="button"
          onClick={() => setActiveFilter("approved")}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition ${
            activeFilter === "approved"
              ? "bg-green-600 text-white"
              : "bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"
          }`}
        >
          Approved ({approvedCount})
        </button>
        <button
          type="button"
          onClick={() => setActiveFilter("declined")}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition ${
            activeFilter === "declined"
              ? "bg-red-600 text-white"
              : "bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"
          }`}
        >
          Declined ({declinedCount})
        </button>
        <button
          type="button"
          onClick={() => setActiveFilter("all")}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition ${
            activeFilter === "all"
              ? "bg-zinc-700 text-white"
              : "bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"
          }`}
        >
          All ({submissions.length})
        </button>
      </div>

      {filteredSubmissions.length === 0 ? (
        <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-12 text-center">
          <Disc className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white mb-1">No submissions found</h3>
          <p className="text-sm text-zinc-400 max-w-sm mx-auto">
            {activeFilter === "pending"
              ? "All caught up! There are no pending music submissions waiting for review."
              : `No releases matching "${activeFilter}" status.`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSubmissions.map((sub) => (
            <div
              key={sub.id}
              className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition"
            >
              <div className="flex flex-col md:flex-row gap-6">
                {/* Cover art */}
                <div className="relative w-28 h-28 shrink-0 rounded-lg overflow-hidden bg-zinc-950 border border-zinc-800 flex items-center justify-center">
                  {sub.coverArt ? (
                    <Image src={sub.coverArt} alt={sub.title} fill className="object-cover" />
                  ) : (
                    <Disc className="w-10 h-10 text-zinc-600" />
                  )}
                </div>

                {/* Main details */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-zinc-800 text-[#7CFC00]">
                      {sub.releaseType}
                    </span>
                    <span className="font-mono text-xs uppercase px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                      {sub.genre}
                    </span>
                    {sub.submissionStatus === "pending" && (
                      <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">
                        Pending Review
                      </Badge>
                    )}
                    {sub.submissionStatus === "approved" && (
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                        Approved
                      </Badge>
                    )}
                    {sub.submissionStatus === "declined" && (
                      <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">
                        Declined
                      </Badge>
                    )}
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-white truncate">{sub.title}</h3>
                    <p className="text-sm font-semibold text-zinc-400">By {sub.artistName}</p>
                  </div>

                  {sub.excerpt && (
                    <p className="text-xs text-zinc-300 line-clamp-2">{sub.excerpt}</p>
                  )}

                  <div className="flex items-center gap-4 text-xs text-zinc-400 pt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                      Release: {sub.releaseDate}
                    </span>
                    <span className="flex items-center gap-1">
                      Submitted: {new Date(sub.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Audio Player if track attached */}
                  {sub.audioUrl && (
                    <div className="pt-2">
                      <div className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold mb-1 flex items-center gap-1">
                        <Music className="w-3 h-3 text-[#7CFC00]" />
                        Attached Audio Track
                      </div>
                      <audio controls className="w-full h-8" src={sub.audioUrl} />
                    </div>
                  )}

                  {/* Streaming Links */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    {sub.spotifyUrl && (
                      <a
                        href={sub.spotifyUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-zinc-800 hover:bg-[#1DB954]/20 hover:text-[#1DB954] text-zinc-300 transition"
                      >
                        Spotify <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    {sub.appleMusicUrl && (
                      <a
                        href={sub.appleMusicUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-zinc-800 hover:bg-[#FA2D48]/20 hover:text-[#FA2D48] text-zinc-300 transition"
                      >
                        Apple Music <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    {sub.bandcampUrl && (
                      <a
                        href={sub.bandcampUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-zinc-800 hover:bg-[#1DA0C3]/20 hover:text-[#1DA0C3] text-zinc-300 transition"
                      >
                        Bandcamp <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    {sub.youtubeUrl && (
                      <a
                        href={sub.youtubeUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-zinc-800 hover:bg-[#FF0000]/20 hover:text-[#FF0000] text-zinc-300 transition"
                      >
                        YouTube <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>

                  {sub.submissionStatus === "declined" && sub.declineReason && (
                    <div className="flex items-start gap-2 bg-red-950/30 border border-red-900/40 rounded p-2.5 text-xs text-red-300 mt-2">
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-red-200">Decline reason:</span>{" "}
                        {sub.declineReason}
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions column */}
                <div className="flex md:flex-col justify-end md:justify-center gap-2 shrink-0 border-t md:border-t-0 md:border-l border-zinc-800 pt-3 md:pt-0 md:pl-4">
                  {sub.submissionStatus === "pending" && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => handleApprove(sub.id)}
                        disabled={isPending}
                        className="bg-[#7CFC00] text-black hover:bg-[#7CFC00]/90 font-bold text-xs"
                      >
                        <Check className="w-3.5 h-3.5 mr-1" />
                        Approve & Publish
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenDecline(sub.id)}
                        disabled={isPending}
                        className="border-red-500/40 text-red-400 hover:bg-red-500/10 text-xs"
                      >
                        <X className="w-3.5 h-3.5 mr-1" />
                        Decline
                      </Button>
                    </>
                  )}

                  <Link href={`/admin/music/${sub.id}` as Route}>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 text-xs w-full"
                    >
                      <Pencil className="w-3.5 h-3.5 mr-1" />
                      Edit Details
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Decline Reason Modal */}
      <Dialog open={declineDialogOpen} onOpenChange={setDeclineDialogOpen}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>Decline Music Submission</DialogTitle>
            <DialogDescription className="text-zinc-400 text-sm">
              Provide feedback or notes to the artist explaining why this submission was not
              approved.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label
                htmlFor="decline-reason"
                className="text-xs font-semibold uppercase tracking-wider text-zinc-400"
              >
                Feedback / Reason (Optional)
              </label>
              <Textarea
                id="decline-reason"
                placeholder="e.g., Audio quality issue, missing high-res cover art, or already scheduled."
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                className="bg-zinc-900 border-zinc-800 text-white resize-none h-24"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDeclineDialogOpen(false)}
              className="border-zinc-800 text-zinc-400 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDecline}
              disabled={isPending}
              className="bg-red-600 hover:bg-red-700 text-white font-bold"
            >
              Confirm Decline
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
