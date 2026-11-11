import { useEffect, useRef } from "react";

const STREAM_URL =
  "https://stream.mux.com/tLkHO1qZoaaQOUeVWo8hEBeGQfySP02EPS02BmnNFyXys.m3u8";
const NATIVE_HLS_TYPE = "application/vnd.apple.mpegurl";
const GRID_LINES = ["25%", "50%", "75%"];

export const HeroBackground = () => {
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const start = async () => {
      if (prefersReducedMotion) return;
      try {
        await video.play();
      } catch (error) {
        // Browsers may refuse autoplay. The video then simply stays on its first frame.
        console.debug("Background video did not autoplay", error.name);
      }
    };

    let hls;
    let isCancelled = false;

    const attach = async () => {
      // Loaded on demand: the video is not needed for the first paint.
      const { default: Hls } = await import("hls.js");
      if (isCancelled) return;

      if (Hls.isSupported()) {
        hls = new Hls({ enableWorker: false });
        hls.loadSource(STREAM_URL);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, start);
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (!data.fatal) return;
          console.error("Background video failed", data.type, data.details);
          hls.destroy();
        });
      } else if (video.canPlayType(NATIVE_HLS_TYPE)) {
        video.src = STREAM_URL;
        video.addEventListener("loadedmetadata", start, { once: true });
      }
    };

    attach().catch((error) => console.error("Could not load the video player", error));

    return () => {
      isCancelled = true;
      if (hls) hls.destroy();
    };
  }, []);

  return (
    <div className="cs-hero__bg" aria-hidden="true">
      <video ref={videoRef} className="cs-hero__video" muted loop playsInline />
      <div className="cs-hero__shade cs-hero__shade--left" />
      <div className="cs-hero__shade cs-hero__shade--bottom" />

      <div className="cs-hero__grid">
        {GRID_LINES.map((left) => (
          <span key={left} style={{ left }} />
        ))}
      </div>

      <svg className="cs-hero__glow" viewBox="0 0 1200 520" fill="none">
        <defs>
          <linearGradient id="cs-glow-fill" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#0b5d52" />
            <stop offset="50%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#0f5132" />
          </linearGradient>
          <filter id="cs-glow-blur" x="-30%" y="-80%" width="160%" height="260%">
            <feGaussianBlur stdDeviation="25" />
          </filter>
        </defs>
        <ellipse
          cx="600"
          cy="210"
          rx="500"
          ry="95"
          fill="url(#cs-glow-fill)"
          opacity="0.5"
          filter="url(#cs-glow-blur)"
        />
      </svg>
    </div>
  );
};
