import { useCallback, useEffect, useMemo, useRef } from 'react';
import { GoogleMap as GoogleMapComponent, useJsApiLoader, Marker, Polyline } from '@react-google-maps/api';
import { Navigation } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/i18n/LanguageContext';

const LIBRARIES: ('places' | 'geocoding')[] = ['places', 'geocoding'];

interface GoogleMapProps {
  className?: string;
  showDriver?: boolean;
  pickupLocation?: { lat: number; lng: number } | null;
  dropoffLocation?: { lat: number; lng: number } | null;
  driverLocation?: { lat: number; lng: number } | null;
  pickupLabel?: string;
  dropoffLabel?: string;
  showCurrentLocationBtn?: boolean;
  onCurrentLocation?: (lat: number, lng: number) => void;
  routePath?: { lat: number; lng: number }[];
}

const defaultCenter = { lat: 30.0444, lng: 31.2357 }; // Cairo

const mapStyles: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#f8f9fa' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#f8f9fa' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#6b7280' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#e5e7eb' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#f3f4f6' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#dbeafe' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#93c5fd' }] },
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#dcfce7' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
];

export function GoogleMapView({
  className,
  showDriver,
  pickupLocation,
  dropoffLocation,
  driverLocation,
  pickupLabel,
  dropoffLabel,
  showCurrentLocationBtn,
  onCurrentLocation,
  routePath,
}: GoogleMapProps) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  const { t } = useLanguage();
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    libraries: LIBRARIES as any,
  });

  const mapRef = useRef<google.maps.Map | null>(null);

  const center = useMemo(() => {
    if (pickupLocation) return pickupLocation;
    if (dropoffLocation) return dropoffLocation;
    return defaultCenter;
  }, [pickupLocation, dropoffLocation]);

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const onUnmount = useCallback(() => {
    mapRef.current = null;
  }, []);

  // Auto-fit bounds when locations change
  useEffect(() => {
    if (!mapRef.current) return;
    const points: google.maps.LatLngLiteral[] = [];
    if (pickupLocation) points.push(pickupLocation);
    if (dropoffLocation) points.push(dropoffLocation);
    if (showDriver && driverLocation) points.push(driverLocation);

    if (points.length >= 2) {
      const bounds = new google.maps.LatLngBounds();
      points.forEach((p) => bounds.extend(p));
      mapRef.current.fitBounds(bounds, 60);
    } else if (points.length === 1) {
      mapRef.current.panTo(points[0]);
      mapRef.current.setZoom(15);
    }
  }, [pickupLocation, dropoffLocation, driverLocation, showDriver]);

  const mapOptions: google.maps.MapOptions = {
    disableDefaultUI: true,
    zoomControl: false,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
    styles: mapStyles,
  };

  const polylinePath = useMemo(() => {
    if (routePath && routePath.length >= 2) return routePath;
    if (pickupLocation && dropoffLocation) return [pickupLocation, dropoffLocation];
    return [];
  }, [routePath, pickupLocation, dropoffLocation]);

  const handleCurrentLocation = () => {
    if (!navigator.geolocation || !onCurrentLocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => onCurrentLocation(pos.coords.latitude, pos.coords.longitude),
      () => {},
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  if (loadError) {
    return (
      <div className={cn('relative bg-secondary rounded-2xl overflow-hidden flex items-center justify-center', className)}>
        <p className="text-xs text-muted-foreground">{t.map.failedToLoad}</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className={cn('relative bg-secondary rounded-2xl overflow-hidden flex items-center justify-center animate-pulse', className)}>
        <p className="text-xs text-muted-foreground">{t.map.loadingMap}</p>
      </div>
    );
  }

  return (
    <div className={cn('relative rounded-2xl overflow-hidden', className)}>
      <GoogleMapComponent
        mapContainerClassName="w-full h-full"
        center={center}
        zoom={12}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={mapOptions}
      >
        {pickupLocation && (
          <Marker
            position={pickupLocation}
            label={{ text: pickupLabel || 'P', color: '#fff', fontWeight: 'bold', fontSize: '11px' }}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 14,
              fillColor: '#16a34a',
              fillOpacity: 1,
              strokeColor: '#fff',
              strokeWeight: 3,
            }}
          />
        )}

        {dropoffLocation && (
          <Marker
            position={dropoffLocation}
            label={{ text: dropoffLabel || 'D', color: '#fff', fontWeight: 'bold', fontSize: '11px' }}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 14,
              fillColor: '#dc2626',
              fillOpacity: 1,
              strokeColor: '#fff',
              strokeWeight: 3,
            }}
          />
        )}

        {showDriver && driverLocation && (
          <Marker
            position={driverLocation}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: '#2563eb',
              fillOpacity: 1,
              strokeColor: '#fff',
              strokeWeight: 3,
            }}
          />
        )}

        {polylinePath.length >= 2 && (
          <Polyline
            path={polylinePath}
            options={{
              strokeColor: '#1d4ed8',
              strokeOpacity: 0.85,
              strokeWeight: 4,
              geodesic: true,
            }}
          />
        )}
      </GoogleMapComponent>

      {/* Current location FAB */}
      {showCurrentLocationBtn && (
        <button
          onClick={handleCurrentLocation}
          className="absolute bottom-3 right-3 w-10 h-10 rounded-full bg-background shadow-lg border border-border flex items-center justify-center hover:bg-secondary transition-colors"
          aria-label="Current location"
        >
          <Navigation className="w-4 h-4 text-primary" />
        </button>
      )}
    </div>
  );
}
