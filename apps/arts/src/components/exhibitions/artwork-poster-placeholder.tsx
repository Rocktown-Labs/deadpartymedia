import { Image } from "@unpic/react";
import { Play } from "lucide-react";

interface ArtworkPosterPlaceholderProps {
  poster: string;
  title: string;
}

export function ArtworkPosterPlaceholder({ poster, title }: ArtworkPosterPlaceholderProps) {
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-neutral-800 bg-black">
      <Image
        src={poster}
        alt={title}
        width={960}
        height={540}
        className="size-full object-contain"
      />
      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
        <span className="grid size-14 place-items-center rounded-full border border-[#7CFC00] bg-black/80 text-[#7CFC00]">
          <Play className="size-6 fill-current" />
        </span>
      </div>
    </div>
  );
}
