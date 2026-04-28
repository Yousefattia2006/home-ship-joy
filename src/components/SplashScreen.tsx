import { useEffect, useRef } from "react";
import splashVideo from "@/assets/splash.mp4";

interface SplashScreenProps {
  onFinish: () => void;
  maxDurationMs?: number;
}

const SplashScreen = ({ onFinish, maxDurationMs = 8000 }: SplashScreenProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const doneRef = useRef(false);

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    onFinish();
  };

  useEffect(() => {
    const v = videoRef.current;
    if (!v) {
      const t = setTimeout(finish, 800);
      return () => clearTimeout(t);
    }

    // Required for autoplay on mobile/most browsers
    v.muted = true;
    v.defaultMuted = true;
    (v as any).playsInline = true;
    v.setAttribute("playsinline", "true");
    v.setAttribute("webkit-playsinline", "true");

    const tryPlay = () => {
      const p = v.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    };

    tryPlay();
    const retry1 = setTimeout(tryPlay, 100);
    const retry2 = setTimeout(tryPlay, 400);

    // Hard cap so user is never stuck on splash
    const timeout = setTimeout(finish, maxDurationMs);

    // Tap anywhere unblocks autoplay if needed
    const onTap = () => tryPlay();
    window.addEventListener("touchstart", onTap, { once: true, passive: true });
    window.addEventListener("click", onTap, { once: true });

    return () => {
      clearTimeout(timeout);
      clearTimeout(retry1);
      clearTimeout(retry2);
      window.removeEventListener("touchstart", onTap);
      window.removeEventListener("click", onTap);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background">
      <video
        ref={videoRef}
        src={splashVideo}
        autoPlay
        muted
        playsInline
        preload="auto"
        onEnded={finish}
        onError={finish}
        className="w-full h-full object-cover"
      />
    </div>
  );
};

export default SplashScreen;
