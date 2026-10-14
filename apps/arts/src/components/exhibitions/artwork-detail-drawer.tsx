import { Link } from "@tanstack/react-router";
import { Image } from "@unpic/react";
import { ArrowRight, BadgeDollarSign, Calendar, Layers, MapPin, Share2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { type ArtworkListItem, getArtworkByIdOrSlug } from "#/lib/artworks.functions.ts";

interface ArtworkDetailDrawerProps {
  artworkIdentifier?: string;
  artworks: ArtworkListItem[];
  onClose: () => void;
}

export function ArtworkDetailDrawer({
  artworkIdentifier,
  artworks,
  onClose,
}: ArtworkDetailDrawerProps) {
  const [artwork, setArtwork] = useState<ArtworkListItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!artworkIdentifier) {
      setArtwork(null);
      return;
    }

    // Try finding in loaded memory first (zero network lag)
    const found = artworks.find(
      (item) => item.slug === artworkIdentifier || String(item.id) === artworkIdentifier,
    );

    if (found) {
      setArtwork(found);
      return;
    }

    // Fallback: fetch from server by slug or id
    let isCancelled = false;
    setIsLoading(true);

    void getArtworkByIdOrSlug({ data: { identifier: artworkIdentifier } })
      .then((result) => {
        if (!isCancelled) {
          setArtwork(result);
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [artworkIdentifier, artworks]);

  useEffect(() => {
    if (!artworkIdentifier) {
      return;
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [artworkIdentifier, onClose]);

  if (!artworkIdentifier) {
    return null;
  }

  const handleShare = async () => {
    if (typeof window === "undefined") {
      return;
    }
    const shareUrl = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({
          title: artwork ? `${artwork.title} - Dead Party Arts` : "Dead Party Arts Exhibition",
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast.success("Link copied to clipboard!");
      }
    } catch {
      // User cancelled share
    }
  };

  const formattedPrice =
    artwork?.priceCents && artwork.priceCents > 0
      ? `$${(artwork.priceCents / 100).toFixed(2)}`
      : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={artwork?.title ?? "Artwork details"}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md transition-opacity duration-200"
    >
      {/* Backdrop touch dismiss */}
      <div
        className="absolute inset-0"
        onClick={onClose}
        onKeyDown={(e) => {
          if (e.key === "Enter") onClose();
        }}
        tabIndex={-1}
        aria-hidden="true"
      />

      {/* Main Drawer / Modal */}
      <div className="relative z-10 flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl border-t border-neutral-700/80 bg-[#101010] shadow-2xl sm:max-h-[85vh] sm:max-w-4xl sm:rounded-2xl sm:border sm:border-neutral-800">
        {/* Mobile drag handle */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="h-1.5 w-12 rounded-full bg-neutral-600/80" />
        </div>

        {/* Header bar with Close and Share */}
        <div className="flex items-center justify-between border-b border-neutral-800/80 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <span className="font-black text-xs uppercase tracking-[0.22em] text-[#7CFC00]">
              {artwork?.medium ?? "Artwork View"}
            </span>
            {artwork?.forSale ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#7CFC00]/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#7CFC00]">
                <BadgeDollarSign className="size-3" />
                Available {formattedPrice ? `• ${formattedPrice}` : ""}
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleShare}
              className="grid size-9 place-items-center rounded-full text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white active:scale-95 [touch-action:manipulation]"
              aria-label="Share artwork"
            >
              <Share2 className="size-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="grid size-9 place-items-center rounded-full text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white active:scale-95 [touch-action:manipulation]"
              aria-label="Close dialog"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Content body */}
        <div className="overflow-y-auto overscroll-contain p-4 sm:p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
          {isLoading && !artwork ? (
            <div className="grid min-h-[300px] place-items-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#7CFC00] border-t-transparent" />
            </div>
          ) : artwork ? (
            <div className="grid gap-6 md:grid-cols-[1.1fr_0.9fr] md:items-start">
              {/* Artwork showcase visual */}
              <div className="overflow-hidden rounded-xl border border-neutral-800 bg-black">
                <Image
                  src={artwork.image}
                  alt={artwork.title}
                  width={960}
                  height={960}
                  className="max-h-[60vh] w-full object-contain md:max-h-[70vh]"
                />
              </div>

              {/* Artwork details & metadata */}
              <div className="flex flex-col justify-between space-y-6">
                <div>
                  <h2 className="font-black text-2xl tracking-tight text-white sm:text-3xl">
                    {artwork.title}
                  </h2>

                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-neutral-400">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Layers className="size-3.5 text-[#7CFC00]" />
                      {artwork.medium ?? "Mixed practice"}
                    </span>
                    {artwork.year ? (
                      <span className="flex items-center gap-1.5 font-medium">
                        <Calendar className="size-3.5 text-[#7CFC00]" />
                        {artwork.year}
                      </span>
                    ) : null}
                  </div>

                  {artwork.description ? (
                    <div className="mt-5 rounded-xl border border-neutral-800/80 bg-neutral-900/60 p-4">
                      <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-neutral-500">
                        Description & Notes
                      </h4>
                      <p className="mt-2 text-sm leading-relaxed text-neutral-300">
                        {artwork.description}
                      </p>
                    </div>
                  ) : null}

                  {artwork.forSale && formattedPrice ? (
                    <div className="mt-5 flex items-center gap-3 rounded-xl border border-[#7CFC00]/30 bg-[#7CFC00]/10 p-4">
                      <BadgeDollarSign className="size-7 shrink-0 text-[#7CFC00]" />
                      <div>
                        <p className="font-black text-2xl leading-none text-[#7CFC00]">
                          {formattedPrice}
                        </p>
                        <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-400">
                          Available — asking price
                        </p>
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* Creator card */}
                <div className="rounded-xl border border-neutral-800 bg-[#141414] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">
                        Artmaker
                      </p>
                      <h3 className="truncate font-black text-lg text-white">
                        {artwork.artmakerName}
                      </h3>
                      <p className="flex items-center gap-1 text-xs text-neutral-400">
                        <MapPin className="size-3 text-[#7CFC00]" />
                        {artwork.city}, {artwork.state}
                      </p>
                    </div>

                    <Link
                      to="/artmakers/$slug"
                      params={{ slug: artwork.artmakerSlug }}
                      onClick={onClose}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[#7CFC00] bg-[#7CFC00] px-3.5 py-2 text-xs font-black uppercase tracking-[0.14em] text-black no-underline transition-colors hover:bg-[#a5ff43] active:scale-95 [touch-action:manipulation]"
                    >
                      <span>Profile</span>
                      <ArrowRight className="size-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-sm text-neutral-500">
              Artwork details could not be loaded.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
