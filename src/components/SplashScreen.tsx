import { useEffect, useRef, useState } from "react";
import splashVideo from "@/assets/splash.mp4";

interface SplashScreenProps {
  onFinish: () => void;
  maxDurationMs?: number;
}

const SplashScreen = ({ onFinish, maxDurationMs = 6000 }: SplashScreenProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [done, setDone] = useState(false);

  const finish = () => {
    if (done) return;
    setDone(true);
    onFinish();
  };

  useEffect(() => {
    const v = videoRef.current;
    if (v) {
      v.play().catch(() => {
        // Autoplay blocked — finish immediately
        finish();
      });
    }
    const timeout = setTimeout(finish, maxDurationMs);
    return () => clearTimeout(timeout);
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
        onEnded={finish}
        className="w-full h-full object-cover"
      />
    </div>
  );
};

export default SplashScreen;
