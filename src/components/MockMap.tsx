import { MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MockMapProps {
  className?: string;
  showDriver?: boolean;
  pickupLabel?: string;
  dropoffLabel?: string;
}

export function MockMap({ className, showDriver, pickupLabel, dropoffLabel }: MockMapProps) {
  return (
    <div className={cn('relative bg-secondary rounded-lg overflow-hidden', className)}>
      {/* Grid pattern to simulate map */}
      <div className="absolute inset-0 opacity-20">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Simulated roads */}
      <div className="absolute inset-0">
        <div className="absolute top-1/3 left-0 right-0 h-1 bg-muted-foreground/10" />
        <div className="absolute top-2/3 left-0 right-0 h-0.5 bg-muted-foreground/10" />
        <div className="absolute left-1/4 top-0 bottom-0 w-0.5 bg-muted-foreground/10" />
        <div className="absolute left-3/4 top-0 bottom-0 w-1 bg-muted-foreground/10" />
      </div>

      {/* Route line */}
      {pickupLabel && dropoffLabel && (
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <path
            d="M 30 35 Q 50 20 70 65"
            fill="none"
            stroke="hsl(var(--foreground))"
            strokeWidth="0.8"
            strokeDasharray="2,2"
          />
        </svg>
      )}

      {/* Pickup marker */}
      {pickupLabel && (
        <div className="absolute top-[30%] left-[25%] flex flex-col items-center">
          <div className="bg-accent text-accent-foreground rounded-full p-1.5 shadow-lg">
            <MapPin className="w-4 h-4" />
          </div>
          <span className="mt-1 text-[10px] font-semibold bg-card/90 px-1.5 py-0.5 rounded shadow text-foreground">
            {pickupLabel}
          </span>
        </div>
      )}

      {/* Dropoff marker */}
      {dropoffLabel && (
        <div className="absolute top-[60%] left-[65%] flex flex-col items-center">
          <div className="bg-destructive text-destructive-foreground rounded-full p-1.5 shadow-lg">
            <MapPin className="w-4 h-4" />
          </div>
          <span className="mt-1 text-[10px] font-semibold bg-card/90 px-1.5 py-0.5 rounded shadow text-foreground">
            {dropoffLabel}
          </span>
        </div>
      )}

      {/* Driver marker */}
      {showDriver && (
        <div className="absolute top-[45%] left-[45%] flex flex-col items-center animate-pulse-dot">
          <div className="bg-primary text-primary-foreground rounded-full p-2 shadow-lg">
            <div className="w-3 h-3 rounded-full bg-accent" />
          </div>
        </div>
      )}

      {/* Map watermark */}
      <div className="absolute bottom-2 right-2 text-[9px] text-muted-foreground/40 font-medium">
        Map preview • Google Maps integration pending
      </div>
    </div>
  );
}
