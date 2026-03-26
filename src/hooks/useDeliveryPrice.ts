import { useEffect, useState, useRef } from 'react';

interface Coords {
  lat: number;
  lng: number;
}

interface PriceResult {
  loading: boolean;
  distanceKm: number | null;
  finalPrice: number | null;
  error: boolean;
  routePath: { lat: number; lng: number }[];
  outOfZone: boolean;
}

export function useDeliveryPrice(
  pickup: Coords | null,
  dropoff: Coords | null
): PriceResult {
  const [loading, setLoading] = useState(false);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [error, setError] = useState(false);
  const [routePath, setRoutePath] = useState<{ lat: number; lng: number }[]>([]);
  const serviceRef = useRef<google.maps.DirectionsService | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!pickup || !dropoff) {
      setDistanceKm(null);
      setError(false);
      setLoading(false);
      setRoutePath([]);
      return;
    }

    let isCancelled = false;

    const calculate = () => {
      const requestId = ++requestIdRef.current;
      setLoading(true);
      setError(false);

      try {
        if (!window.google?.maps?.DirectionsService) {
          console.error('[useDeliveryPrice] Google Maps DirectionsService is unavailable', {
            requestId,
            pickup,
            dropoff,
          });
          if (!isCancelled) {
            setDistanceKm(null);
            setError(true);
            setLoading(false);
            setRoutePath([]);
          }
          return;
        }

        if (!serviceRef.current) {
          serviceRef.current = new google.maps.DirectionsService();
        }

        const request: google.maps.DirectionsRequest = {
          origin: { lat: pickup.lat, lng: pickup.lng },
          destination: { lat: dropoff.lat, lng: dropoff.lng },
          travelMode: google.maps.TravelMode.DRIVING,
          unitSystem: google.maps.UnitSystem.METRIC,
          provideRouteAlternatives: false,
        };

        console.info('[useDeliveryPrice] Requesting driving route', {
          requestId,
          request,
        });

        serviceRef.current.route(request, (result, status) => {
          if (isCancelled || requestId !== requestIdRef.current) {
            return;
          }

          if (status !== google.maps.DirectionsStatus.OK || !result) {
            console.error('[useDeliveryPrice] Route request failed', {
              requestId,
              status,
              pickup,
              dropoff,
              response: result,
            });
            setDistanceKm(null);
            setError(true);
            setLoading(false);
            setRoutePath([]);
            return;
          }

          const route = result.routes?.[0];
          const leg = route?.legs?.[0];
          const meters = leg?.distance?.value;

          if (typeof meters !== 'number') {
            console.error('[useDeliveryPrice] Route response missing distance value', {
              requestId,
              pickup,
              dropoff,
              route,
              leg,
            });
            setDistanceKm(null);
            setError(true);
            setLoading(false);
            setRoutePath([]);
            return;
          }

          const routeDistanceKm = meters / 1000;

          // Extract route path for map display
          const path = route?.overview_path?.map((p: google.maps.LatLng) => ({
            lat: p.lat(),
            lng: p.lng(),
          })) || [];

          console.info('[useDeliveryPrice] Route request succeeded', {
            requestId,
            distanceKm: routeDistanceKm,
            pathPoints: path.length,
          });

          setDistanceKm(routeDistanceKm);
          setRoutePath(path);
          setError(false);
          setLoading(false);
        });
      } catch (routeError) {
        console.error('[useDeliveryPrice] Unexpected route calculation error', {
          requestId,
          pickup,
          dropoff,
          error: routeError,
        });
        if (!isCancelled) {
          setDistanceKm(null);
          setError(true);
          setLoading(false);
          setRoutePath([]);
        }
      }
    };

    const timer = setTimeout(calculate, 500);
    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [pickup?.lat, pickup?.lng, dropoff?.lat, dropoff?.lng]);

  if (distanceKm === null) {
    return { loading, distanceKm: null, finalPrice: null, error, routePath, outOfZone: false };
  }

  const outOfZone = distanceKm > 15;
  const finalPrice = outOfZone ? null : Math.round(100 + Math.max(0, distanceKm - 2) * 10);

  return { loading, distanceKm, finalPrice, error, routePath, outOfZone };
}
