import { AlertCircle, Loader2, MapPinOff } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';

interface DeliveryPriceBarProps {
  loading: boolean;
  finalPrice: number | null;
  distanceKm: number | null;
  hasLocations: boolean;
  error: boolean;
  outOfZone: boolean;
}

export function DeliveryPriceBar({
  loading,
  finalPrice,
  distanceKm,
  hasLocations,
  error,
  outOfZone,
}: DeliveryPriceBarProps) {
  const { t } = useLanguage();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
      <div className="max-w-lg mx-auto px-5 py-4">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-2">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span className="text-sm font-medium text-muted-foreground">{t.priceBar.calculatingPrice}</span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center gap-2 py-2 text-destructive">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm font-medium">{t.priceBar.routeError}</span>
          </div>
        ) : outOfZone && distanceKm !== null ? (
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{t.priceBar.distance}: {distanceKm.toFixed(1)} km</p>
            <div className="flex items-center justify-center gap-2 py-1 text-destructive">
              <MapPinOff className="w-5 h-5" />
              <span className="text-base font-bold">{t.priceBar.outOfZone}</span>
            </div>
          </div>
        ) : finalPrice !== null && distanceKm !== null ? (
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{t.priceBar.distance}: {distanceKm.toFixed(1)} km</p>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">{t.priceBar.totalPrice}</span>
              <span className="text-2xl font-black text-primary">{finalPrice} {t.common.egp}</span>
            </div>
          </div>
        ) : (
          <p className="text-center text-sm text-muted-foreground py-2">
            {t.priceBar.enterLocations}
          </p>
        )}
      </div>
    </div>
  );
}
