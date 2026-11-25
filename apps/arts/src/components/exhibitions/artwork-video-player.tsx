import "@videojs/react/video/neutral-skin.css";
import { ArtworkPosterPlaceholder } from "#/components/exhibitions/artwork-poster-placeholder.tsx";
import type { EmbeddableVideoLink } from "#/lib/video.ts";
import { VimeoVideo } from "@videojs/react/media/vimeo-video";
import { YouTubeVideo } from "@videojs/react/media/youtube-video";
import { NeutralVideoSkin, Video, VideoPlayer } from "@videojs/react/video";
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
    return <ArtworkPosterPlaceholder poster={poster} title={title} />;
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
