import { useEffect } from "react";

interface SplashScreenProps {
  onFinish: () => void;
  durationMs?: number;
}

const SplashScreen = ({ onFinish, durationMs = 0 }: SplashScreenProps) => {
  useEffect(() => {
    if (durationMs <= 0) {
      onFinish();
      return;
    }
    const t = setTimeout(onFinish, durationMs);
    return () => clearTimeout(t);
  }, [durationMs, onFinish]);

  return null;
};

export default SplashScreen;
