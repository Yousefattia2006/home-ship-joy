import { useCallback, useEffect, useRef, useState } from 'react';
import { GoogleMap, useJsApiLoader } from '@react-google-maps/api';
import { ArrowLeft, Loader2, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/i18n/LanguageContext';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const LIBRARIES: ('places' | 'geocoding')[] = ['places', 'geocoding'];

const mapStyles: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#f8f9fa' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#f8f9fa' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#6b7280' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#e5e7eb' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#dbeafe' }] },
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
];

interface MapPickerProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (address: string, lat: number, lng: number) => void;
  title: string;
  confirmLabel: string;
  initialCenter?: { lat: number; lng: number } | null;
}

const defaultCenter = { lat: 30.0444, lng: 31.2357 };

export function MapPicker({ open, onClose, onConfirm, title, confirmLabel, initialCenter }: MapPickerProps) {
  const { t } = useLanguage();
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  const { isLoaded } = useJsApiLoader({ googleMapsApiKey: apiKey, libraries: LIBRARIES as any });

  const mapRef = useRef<google.maps.Map | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const [address, setAddress] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number }>(initialCenter || defaultCenter);
  const [geocoding, setGeocoding] = useState(false);

  useEffect(() => {
    if (open && initialCenter) {
      setCoords(initialCenter);
      setAddress('');
    } else if (open) {
      setCoords(defaultCenter);
      setAddress('');
    }
  }, [open, initialCenter]);

  const reverseGeocode = useCallback((lat: number, lng: number) => {
    if (!geocoderRef.current) {
      geocoderRef.current = new google.maps.Geocoder();
    }
    setGeocoding(true);
    geocoderRef.current.geocode({ location: { lat, lng } }, (results, status) => {
      setGeocoding(false);
      if (status === 'OK' && results && results[0]) {
        setAddress(results[0].formatted_address);
      } else {
        setAddress(t.addressPicker?.selectedLocation || 'Selected location');
      }
    });
  }, [t]);

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const handleIdle = useCallback(() => {
    if (!mapRef.current) return;
    const center = mapRef.current.getCenter();
    if (!center) return;
    const lat = center.lat();
    const lng = center.lng();
    setCoords({ lat, lng });

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => reverseGeocode(lat, lng), 400);
  }, [reverseGeocode]);

  const handleConfirm = () => {
    onConfirm(address || `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`, coords.lat, coords.lng);
    onClose();
  };

  if (!open) return null;

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 28, stiffness: 300 }}
      className="fixed inset-0 z-[60] bg-background flex flex-col safe-top"
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center gap-3 border-b border-border">
        <button onClick={onClose} className="p-2 -ml-2 rounded-full hover:bg-secondary">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-base font-semibold">{title}</h2>
      </div>

      {/* Map area */}
      <div className="flex-1 relative">
        {isLoaded ? (
          <GoogleMap
            mapContainerClassName="w-full h-full"
            center={coords}
            zoom={15}
            onLoad={onLoad}
            onIdle={handleIdle}
            options={{
              disableDefaultUI: true,
              zoomControl: false,
              styles: mapStyles,
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-secondary">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        )}

        {/* Center pin */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <MapPin className="w-10 h-10 text-destructive -mt-10 drop-shadow-lg" />
        </div>
      </div>

      {/* Bottom card */}
      <div className="px-4 py-4 border-t border-border bg-background space-y-3">
        <div className="min-h-[40px] flex items-center gap-2">
          {geocoding ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-primary animate-spin" />
              <span className="text-sm text-muted-foreground">{t.addressPicker?.locating || 'Getting address...'}</span>
            </div>
          ) : (
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <p className={cn('text-sm', address ? 'text-foreground' : 'text-muted-foreground')}>
                {address || (t.addressPicker?.moveMapToSelect || 'Move the map to select a location')}
              </p>
            </div>
          )}
        </div>
        <Button onClick={handleConfirm} className="w-full h-12 text-base font-bold rounded-xl" disabled={geocoding}>
          {confirmLabel}
        </Button>
      </div>
    </motion.div>
  );
}
