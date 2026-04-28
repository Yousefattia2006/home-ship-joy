import { useEffect } from "react";
import { Truck } from "lucide-react";

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
      <div className="absolute inset-0 bg-gradient-to-b from-primary/15 via-background to-background" />
      <div className="relative flex flex-col items-center gap-5">
        <div className="relative h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
          <Truck className="h-12 w-12 text-primary" aria-hidden="true" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-2xl font-bold text-foreground">Tawsel</p>
          <p className="text-sm text-muted-foreground">Delivery</p>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
