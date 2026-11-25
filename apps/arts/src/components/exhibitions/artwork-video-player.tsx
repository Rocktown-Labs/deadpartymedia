import "@videojs/react/video/neutral-skin.css";
import type { EmbeddableVideoLink } from "#/lib/video.ts";
import { Image } from "@unpic/react";
import { VimeoVideo } from "@videojs/react/media/vimeo-video";
import { YouTubeVideo } from "@videojs/react/media/youtube-video";
import { NeutralVideoSkin, Video, VideoPlayer } from "@videojs/react/video";
import { Play } from "lucide-react";
import { type CSSProperties, useEffect, useState } from "react";

interface ArtworkVideoPlayerProps {
  poster: string;
  title: string;
  video: EmbeddableVideoLink;
}

const PLAYER_SKIN_STYLE = {
  "--media-accent-color": "#7CFC00",
  "--media-accent-text-color": "#000000",
  "--media-border-color": "rgb(38 38 38)",
  "--media-border-radius": "0.75rem",
  "--media-focus-ring-color": "#7CFC00",
  "--media-object-fit": "contain",
  aspectRatio: "16 / 9",
  backgroundColor: "#000000",
  width: "100%",
} as CSSProperties;

export function ArtworkVideoPlayer({ poster, title, video }: ArtworkVideoPlayerProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
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

  return (
    <VideoPlayer key={video.playerSrc} poster={poster} title={title}>
      <NeutralVideoSkin style={PLAYER_SKIN_STYLE}>
        {video.provider === "YouTube" ? (
          <YouTubeVideo
            source={{
              engine: { youtube: { rel: 0 } },
              src: video.playerSrc,
            }}
            preload="none"
            playsInline
          />
        ) : video.provider === "Vimeo" ? (
          <VimeoVideo
            source={{
              engine: { vimeo: { dnt: true } },
              src: video.playerSrc,
            }}
            preload="none"
            playsInline
          />
        ) : (
          <Video src={video.playerSrc} preload="metadata" playsInline />
        )}
      </NeutralVideoSkin>
    </VideoPlayer>
  );
}
