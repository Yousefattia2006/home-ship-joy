import { useEffect, useRef } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleEnded = () => onComplete();
    const handleError = () => {
      setTimeout(onComplete, 3000);
    };

    video.addEventListener('ended', handleEnded);
    video.addEventListener('error', handleError);

    const safetyTimer = setTimeout(onComplete, 10000);

    video.play().catch(() => {
      setTimeout(onComplete, 2000);
    });

    return () => {
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('error', handleError);
      clearTimeout(safetyTimer);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 bg-foreground flex items-center justify-center">
      <video
        ref={videoRef}
        src="/splash.mp4"
        muted
        playsInline
        autoPlay
        className="w-full h-full object-cover"
        style={{ objectFit: 'cover' }}
      />
    </div>
  );
}
