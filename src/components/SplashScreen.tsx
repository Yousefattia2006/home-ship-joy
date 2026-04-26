import { useEffect, useRef, useState } from "react";
import splashVideo from "@/assets/splash.mp4";

interface SplashScreenProps {
  onFinish: () => void;
  maxDurationMs?: number;
}

const SplashScreen = ({ onFinish, maxDurationMs = 6000 }: SplashScreenProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [done, setDone] = useState(false);
  const doneRef = useRef(false);

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    setDone(true);
    onFinish();
  };

  useEffect(() => {
    const v = videoRef.current;
    if (!v) {
      const t = setTimeout(finish, 800);
      return () => clearTimeout(t);
    }

    v.muted = true;
    (v as any).playsInline = true;

    const tryPlay = () => v.play().catch(() => {});
    tryPlay();

    // Retry once more shortly after mount (handles iOS first-open hiccup)
    const retry = setTimeout(tryPlay, 250);

    // If video never starts, finish anyway after maxDuration
    const timeout = setTimeout(finish, maxDurationMs);

    // Tap anywhere to skip / unblock autoplay
    const onTap = () => {
      tryPlay();
    };
    window.addEventListener('touchstart', onTap, { once: true, passive: true });
    window.addEventListener('click', onTap, { once: true });

    return () => {
      clearTimeout(timeout);
      clearTimeout(retry);
      window.removeEventListener('touchstart', onTap);
      window.removeEventListener('click', onTap);
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
