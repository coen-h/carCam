"use client";

import { useEffect, useRef } from "react";
import Hls from "hls.js";

interface LiveVideoProps {
  streamUrl: string;
}

export default function LiveVideo({ streamUrl }: LiveVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;

    if (!video) return;

    let hls: Hls;

    if (Hls.isSupported()) {
      hls = new Hls({
        lowLatencyMode: true,
        liveSyncDurationCount: 2,
        liveMaxLatencyDurationCount: 3.5,
        maxLiveSyncPlaybackRate: 1.2,
      });

      hls.loadSource(streamUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch((err) => console.log("Autoplay blocked:", err));
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = streamUrl;
      video.addEventListener("loadedmetadata", () => {
        video.play().catch((err) => console.log("Autoplay blocked:", err));
      });
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [streamUrl]);

  return (
    <video
      ref={videoRef}
      className="rounded-box w-full h-full object-cover"
      muted
      playsInline
      autoPlay
    />
  );
}
