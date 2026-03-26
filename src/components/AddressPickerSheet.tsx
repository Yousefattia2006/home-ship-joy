import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, MapPin, Navigation, Search, PenLine, X, Loader2, Map } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { MapPicker } from '@/components/MapPicker';
import { useLanguage } from '@/i18n/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';


interface AddressPickerSheetProps {
  open: boolean;
  onClose: () => void;
  onSelect: (address: string, lat: number, lng: number) => void;
  onManualEntry?: () => void;
  title: string;
  showManualOption?: boolean;
  type?: 'pickup' | 'dropoff';
}

interface PlaceResult {
  placeId: string;
  mainText: string;
  secondaryText: string;
  description: string;
}

export function AddressPickerSheet({
  open,
  onClose,
  onSelect,
  onManualEntry,
  title,
  showManualOption = false,
  type = 'pickup',
}: AddressPickerSheetProps) {
  const { t } = useLanguage();
  const [query, setQuery] = useState('');
  const [predictions, setPredictions] = useState<PlaceResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [mapPickerOpen, setMapPickerOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>();
  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesService = useRef<google.maps.places.PlacesService | null>(null);
  const dummyDiv = useRef<HTMLDivElement>(null);

  // Initialize legacy services
  useEffect(() => {
    if (open && window.google?.maps?.places) {
      if (!autocompleteService.current) {
        autocompleteService.current = new google.maps.places.AutocompleteService();
      }
      if (!placesService.current && dummyDiv.current) {
        placesService.current = new google.maps.places.PlacesService(dummyDiv.current);
      }
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
    if (!open) {
      setQuery('');
      setPredictions([]);
      setHasSearched(false);
    }
  }, [open]);

  const searchPlaces = useCallback((input: string) => {
    if (!input.trim() || !autocompleteService.current) {
      setPredictions([]);
      setHasSearched(false);
      return;
    }

    setLoading(true);
    setHasSearched(true);

    const cairoBounds = new google.maps.LatLngBounds(
      new google.maps.LatLng(29.8, 30.8),
      new google.maps.LatLng(30.3, 31.7)
    );

    autocompleteService.current.getPlacePredictions(
      {
        input,
        componentRestrictions: { country: 'eg' },
        bounds: cairoBounds,
        types: ['establishment', 'geocode'],
      },
      (results, status) => {
        setLoading(false);
        if (
          status === google.maps.places.PlacesServiceStatus.OK &&
          results &&
          results.length > 0
        ) {
          const mapped: PlaceResult[] = results.map((r) => ({
            placeId: r.place_id,
            mainText: r.structured_formatting?.main_text || r.description,
            secondaryText: r.structured_formatting?.secondary_text || '',
            description: r.description,
          }));
          setPredictions(mapped);
        } else {
          setPredictions([]);
        }
      }
    );
  }, []);

  const handleInputChange = (value: string) => {
    setQuery(value);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (!value.trim()) {
      setPredictions([]);
      setHasSearched(false);
      return;
    }
    debounceTimer.current = setTimeout(() => searchPlaces(value), 300);
  };

  const handleSelectPrediction = (prediction: PlaceResult) => {
    if (!placesService.current) {
      onSelect(prediction.description, 0, 0);
      onClose();
      return;
    }

    placesService.current.getDetails(
      { placeId: prediction.placeId, fields: ['geometry', 'formatted_address', 'name'] },
      (place, status) => {
        if (
          status === google.maps.places.PlacesServiceStatus.OK &&
          place?.geometry?.location
        ) {
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          const address = place.formatted_address || prediction.description;
          onSelect(address, lat, lng);
        } else {
          onSelect(prediction.description, 0, 0);
        }
        onClose();
      }
    );
  };

  const handleCurrentLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        // Try reverse geocoding
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode(
          { location: { lat: latitude, lng: longitude } },
          (results, status) => {
            setLocating(false);
            if (status === 'OK' && results && results[0]) {
              onSelect(results[0].formatted_address, latitude, longitude);
            } else {
              onSelect(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`, latitude, longitude);
            }
            onClose();
          }
        );
      },
      () => {
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleManual = () => {
    onManualEntry?.();
    onClose();
  };

  return (
    <>
      {/* Hidden div for PlacesService */}
      <div ref={dummyDiv} style={{ display: 'none' }} />
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed inset-0 z-50 bg-background flex flex-col safe-top"
          >
            {/* Header */}
            <div className="px-4 pt-4 pb-3 flex items-center gap-3 border-b border-border">
              <button onClick={onClose} className="p-2 -ml-2 rounded-full hover:bg-secondary">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h2 className="text-base font-semibold">{title}</h2>
            </div>

            {/* Search input */}
            <div className="px-4 py-3">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  ref={inputRef}
                  placeholder={t.addressPicker?.searchPlaceholder || 'Search for a location...'}
                  value={query}
                  onChange={(e) => handleInputChange(e.target.value)}
                  className="h-11 pl-10 pr-10 text-base rounded-xl bg-secondary border-0"
                />
                {query && (
                  <button
                    onClick={() => { setQuery(''); setPredictions([]); setHasSearched(false); }}
                    className="absolute right-3 top-3"
                  >
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                )}
              </div>
            </div>

            {/* Quick actions */}
            <div className="px-4 space-y-1">
              <button
                onClick={handleCurrentLocation}
                disabled={locating}
                className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-secondary transition-colors"
              >
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                  {locating ? (
                    <Loader2 className="w-4 h-4 text-primary animate-spin" />
                  ) : (
                    <Navigation className="w-4 h-4 text-primary" />
                  )}
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium">
                    {locating
                      ? (t.addressPicker?.locating || 'Getting location...')
                      : (t.addressPicker?.currentLocation || 'Use current location')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t.addressPicker?.currentLocationDesc || 'Pin your current GPS location'}
                  </p>
                </div>
              </button>

              {/* Set location on map */}
              <button
                onClick={() => setMapPickerOpen(true)}
                className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-secondary transition-colors"
              >
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                  <Map className="w-4 h-4 text-primary" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium">
                    {t.addressPicker?.setOnMap || 'Set location on map'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t.addressPicker?.setOnMapDesc || 'Pick a point by moving the map'}
                  </p>
                </div>
              </button>

              {showManualOption && (
                <button
                  onClick={handleManual}
                  className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-secondary transition-colors"
                >
                  <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center">
                    <PenLine className="w-4 h-4 text-accent-foreground" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium">
                      {t.addressPicker?.manualEntry || 'Enter address manually'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t.addressPicker?.manualEntryDesc || 'Type the address without map pin'}
                    </p>
                  </div>
                </button>
              )}
            </div>

            {/* Divider */}
            {(predictions.length > 0 || loading) && (
              <div className="mx-4 my-2 border-t border-border" />
            )}

            {/* Results */}
            <div className="flex-1 overflow-y-auto px-4 pt-1">
              {loading && (
                <div className="flex items-center justify-center gap-2 py-8">
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  <span className="text-sm text-muted-foreground">{t.addressPicker?.searching || 'Searching...'}</span>
                </div>
              )}

              {!loading && predictions.length > 0 && (
                <div className="space-y-0.5">
                  {predictions.map((p) => (
                    <button
                      key={p.placeId}
                      onClick={() => handleSelectPrediction(p)}
                      className="flex items-start gap-3 w-full p-3 rounded-xl hover:bg-secondary active:bg-secondary/80 transition-colors text-left"
                    >
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center mt-0.5 shrink-0">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold truncate">{p.mainText}</p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{p.secondaryText}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {!loading && hasSearched && query.trim() && predictions.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-8">
                  {t.addressPicker?.noResults || 'No results found'}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <MapPicker
        open={mapPickerOpen}
        onClose={() => setMapPickerOpen(false)}
        onConfirm={(address, lat, lng) => {
          onSelect(address, lat, lng);
          setMapPickerOpen(false);
          onClose();
        }}
        title={title}
        confirmLabel={
          type === 'pickup'
            ? (t.addressPicker?.confirmPickup || 'Confirm Pickup Location')
            : (t.addressPicker?.confirmDropoff || 'Confirm Dropoff Location')
        }
      />
    </>
  );
}
