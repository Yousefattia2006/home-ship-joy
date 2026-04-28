import { useEffect } from "react";

interface SplashScreenProps {
  onFinish: () => void;
  durationMs?: number;
}

const SplashScreen = ({ onFinish, durationMs = 1800 }: SplashScreenProps) => {
  useEffect(() => {
    if (durationMs <= 0) {
      onFinish();
      return;
    }
    const t = setTimeout(onFinish, durationMs);
    return () => clearTimeout(t);
  }, [durationMs, onFinish]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-background">
      <video
        className="h-full w-full object-cover"
        src="/tawsel-splash.mp4"
        autoPlay
        muted
        playsInline
        preload="auto"
        aria-label="Tawsel intro"
      />
    </div>
  );
};

export default SplashScreen;
