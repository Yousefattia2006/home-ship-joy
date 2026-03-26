import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, User, CheckCircle, Star, Flag, XCircle } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { GoogleMapView } from '@/components/GoogleMap';
import { StatusBadge } from '@/components/StatusBadge';
import { ChatSheet } from '@/components/ChatSheet';
import { CancellationDialog } from '@/components/CancellationDialog';
import { ReportDialog } from '@/components/ReportDialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const statusSteps = [
  'finding_driver', 'driver_accepted', 'arriving_pickup', 'picked_up', 'en_route', 'delivered'
] as const;

export default function TrackDelivery() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [delivery, setDelivery] = useState<any>(null);
  const [driverProfile, setDriverProfile] = useState<any>(null);
  const [driverLocation, setDriverLocation] = useState<{lat: number; lng: number} | null>(null);
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [hasRated, setHasRated] = useState(false);
  const [statusHistory, setStatusHistory] = useState<any[]>([]);
  const [etaText, setEtaText] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const fetch = async () => {
      const { data } = await supabase.from('deliveries').select('*').eq('id', id).maybeSingle();
      if (data) {
        setDelivery(data);
        if (data.driver_user_id) {
          const { data: dp } = await supabase.from('driver_profiles').select('full_name, phone, plate_number, vehicle_type, rating, current_lat, current_lng').eq('user_id', data.driver_user_id).maybeSingle();
          if (dp) {
            setDriverProfile(dp);
            if (dp.current_lat && dp.current_lng) setDriverLocation({ lat: dp.current_lat, lng: dp.current_lng });
          }
        }
      }
      // Fetch status history
      const { data: history } = await supabase.from('order_status_history')
        .select('*').eq('delivery_id', id).order('created_at', { ascending: true });
      if (history) setStatusHistory(history);
    };
    fetch();

    supabase.from('ratings').select('id').eq('delivery_id', id).maybeSingle()
      .then(({ data }) => { if (data) setHasRated(true); });

    const channel = supabase
      .channel(`delivery-${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'deliveries', filter: `id=eq.${id}` }, (payload) => {
        setDelivery(payload.new);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id]);

  // Poll driver location for live tracking
  useEffect(() => {
    if (!delivery?.driver_user_id || delivery.status === 'delivered' || delivery.status === 'cancelled') return;
    const interval = setInterval(async () => {
      const { data } = await supabase.from('driver_locations')
        .select('lat, lng')
        .eq('delivery_id', delivery.id)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) setDriverLocation({ lat: data.lat, lng: data.lng });
    }, 5000);
    return () => clearInterval(interval);
  }, [delivery]);

  // ETA calculation using Google Maps Directions API
  useEffect(() => {
    if (!delivery || !driverLocation) { setEtaText(null); return; }
    if (['delivered', 'cancelled', 'finding_driver'].includes(delivery.status)) { setEtaText(null); return; }
    if (!window.google?.maps?.DirectionsService) { setEtaText(null); return; }

    // Determine destination: before pickup → store, after pickup → customer
    const isBeforePickup = ['driver_accepted', 'arriving_pickup'].includes(delivery.status);
    const dest = isBeforePickup
      ? (delivery.pickup_lat ? { lat: delivery.pickup_lat, lng: delivery.pickup_lng } : null)
      : (delivery.dropoff_lat ? { lat: delivery.dropoff_lat, lng: delivery.dropoff_lng } : null);

    if (!dest) { setEtaText(null); return; }

    const svc = new google.maps.DirectionsService();
    svc.route({
      origin: driverLocation,
      destination: dest,
      travelMode: google.maps.TravelMode.DRIVING,
    }, (result, status) => {
      if (status === google.maps.DirectionsStatus.OK && result) {
        const duration = result.routes?.[0]?.legs?.[0]?.duration?.text;
        if (duration) {
          const prefix = isBeforePickup
            ? (t.delivery as any).etaToPickup || 'ETA to pickup'
            : (t.delivery as any).etaToDropoff || 'ETA to customer';
          setEtaText(`${prefix}: ${duration}`);
        } else {
          setEtaText(null);
        }
      } else {
        setEtaText(null);
      }
    });
  }, [driverLocation, delivery?.status, delivery?.pickup_lat, delivery?.dropoff_lat, t]);

  const confirmHandover = async () => {
    if (!delivery) return;
    const { error } = await supabase.from('deliveries')
      .update({ store_confirmed_handover: true, store_confirmed_at: new Date().toISOString() })
      .eq('id', delivery.id);
    if (error) toast.error(t.common.error);
    else toast.success(t.store.handoverConfirmed);
  };

  const submitRating = async () => {
    if (!delivery || !user) return;
    const { error } = await supabase.from('ratings').insert({
      delivery_id: delivery.id,
      store_user_id: user.id,
      driver_user_id: delivery.driver_user_id,
      rating,
      comment: ratingComment || null,
    });
    if (error) toast.error(t.common.error);
    else {
      toast.success(t.common.success);
      setHasRated(true);
      setShowRating(false);
    }
  };

  if (!delivery) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">{t.common.loading}</div>;

  const currentStep = statusSteps.indexOf(delivery.status as any);
  const isActive = !['delivered', 'cancelled'].includes(delivery.status);

  return (
    <div className="min-h-screen bg-background safe-top flex flex-col">
      <div className="px-5 pt-6 pb-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-secondary">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold">{t.delivery.trackDelivery}</h1>
      </div>

      <GoogleMapView
        className="mx-5 h-56 mb-4"
        pickupLocation={delivery.pickup_lat ? { lat: delivery.pickup_lat, lng: delivery.pickup_lng } : undefined}
        dropoffLocation={delivery.dropoff_lat ? { lat: delivery.dropoff_lat, lng: delivery.dropoff_lng } : undefined}
        driverLocation={driverLocation}
        pickupLabel="Pickup"
        dropoffLabel="Dropoff"
        showDriver={!!driverLocation && isActive}
      />

      <div className="px-5 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={delivery.status} />
          {etaText && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary">
              🕐 {etaText}
            </span>
          )}
        </div>
        <div className="mt-4 flex items-center gap-1">
          {statusSteps.map((_, i) => (
            <div
              key={i}
              className={`flex-1 h-1 rounded-full transition-colors ${
                i <= currentStep ? 'bg-accent' : 'bg-border'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="px-5 flex-1 space-y-4 pb-8">
        <div className="bg-card rounded-xl p-4 border border-border space-y-3">
          <div>
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{t.store.pickupAddress}</p>
            <p className="text-sm font-medium">{delivery.pickup_address}</p>
          </div>
          <div className="border-t border-border" />
          <div>
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{t.store.dropoffAddress}</p>
            <p className="text-sm font-medium">{delivery.dropoff_address}</p>
          </div>
          {delivery.cash_amount > 0 && (
            <>
              <div className="border-t border-border" />
              <div className="flex justify-between items-center">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{t.store.cashAmount}</p>
                <p className="text-sm font-bold">{delivery.cash_amount} {t.common.egp}</p>
              </div>
            </>
          )}
          {delivery.notes && (
            <>
              <div className="border-t border-border" />
              <p className="text-xs text-muted-foreground">{delivery.notes}</p>
            </>
          )}
          {delivery.delivery_photo_url && (
            <>
              <div className="border-t border-border" />
              <div>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">{t.proofOfDelivery?.takePhoto || 'Delivery Photo'}</p>
                <img src={delivery.delivery_photo_url} alt="Delivery proof" className="w-full h-32 object-cover rounded-lg" />
              </div>
            </>
          )}
        </div>

        {/* Driver info with chat + call */}
        {driverProfile && currentStep >= 1 && (
          <div className="bg-card rounded-xl p-4 border border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                <User className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">{driverProfile.full_name}</p>
                <p className="text-xs text-muted-foreground">★ {driverProfile.rating?.toFixed(1)} · {driverProfile.plate_number}</p>
              </div>
              <div className="flex gap-2">
                {driverProfile.phone && (
                  <a href={`tel:${driverProfile.phone}`}>
                    <Button size="icon" variant="outline" className="rounded-full h-9 w-9">
                      <Phone className="w-4 h-4" />
                    </Button>
                  </a>
                )}
                {isActive && <ChatSheet deliveryId={delivery.id} otherUserName={driverProfile.full_name} />}
              </div>
            </div>
          </div>
        )}

        {/* Store handover confirmation */}
        {delivery.status === 'arriving_pickup' && !delivery.store_confirmed_handover && (
          <Button onClick={confirmHandover} className="w-full h-14 text-base font-bold rounded-xl gap-2">
            <CheckCircle className="w-5 h-5" />
            {t.store.confirmHandover}
          </Button>
        )}
        {delivery.store_confirmed_handover && delivery.status !== 'delivered' && (
          <div className="flex items-center gap-2 text-accent text-sm font-medium justify-center">
            <CheckCircle className="w-4 h-4" />
            {t.store.handoverConfirmed}
          </div>
        )}

        {/* Cancel + Report for active deliveries (cancellable before pickup is confirmed) */}
        {isActive && !['picked_up', 'en_route'].includes(delivery.status) && (
          <div className="flex gap-2">
            <CancellationDialog
              delivery={delivery}
              role="store"
              onCancelled={() => navigate('/store/deliveries')}
            >
              <Button variant="destructive" size="sm" className="flex-1 gap-1 rounded-xl font-semibold">
                <XCircle className="w-3.5 h-3.5" /> {t.cancellation?.title || 'Cancel Order'}
              </Button>
            </CancellationDialog>
            <ReportDialog deliveryId={delivery.id} role="store">
              <Button variant="outline" size="sm" className="gap-1 rounded-xl">
                <Flag className="w-3.5 h-3.5" /> {t.report?.title || 'Report'}
              </Button>
            </ReportDialog>
          </div>
        )}
        {/* Report only after pickup */}
        {isActive && ['picked_up', 'en_route'].includes(delivery.status) && (
          <ReportDialog deliveryId={delivery.id} role="store">
            <Button variant="outline" size="sm" className="gap-1 rounded-xl w-full">
              <Flag className="w-3.5 h-3.5" /> {t.report?.title || 'Report'}
            </Button>
          </ReportDialog>
        )}

        {/* Rating */}
        {delivery.status === 'delivered' && !hasRated && !showRating && (
          <Button onClick={() => setShowRating(true)} variant="outline" className="w-full h-12 font-bold rounded-xl gap-2">
            <Star className="w-4 h-4" />
            {t.store.rateDriver}
          </Button>
        )}
        {showRating && (
          <div className="bg-card rounded-xl p-4 border border-border space-y-3">
            <p className="text-sm font-semibold">{t.store.rateDriver}</p>
            <div className="flex gap-2 justify-center">
              {[1, 2, 3, 4, 5].map((s) => (
                <button key={s} onClick={() => setRating(s)} className="p-1">
                  <Star className={cn('w-8 h-8', s <= rating ? 'text-warning fill-warning' : 'text-border')} />
                </button>
              ))}
            </div>
            <Textarea
              placeholder={t.store.ratingComment}
              value={ratingComment}
              onChange={(e) => setRatingComment(e.target.value)}
              rows={2}
              className="resize-none"
            />
            <Button onClick={submitRating} className="w-full h-12 font-bold rounded-xl">
              {t.store.submitRating}
            </Button>
          </div>
        )}

        {/* Status History Timeline */}
        {statusHistory.length > 0 && (
          <div className="bg-card rounded-xl p-4 border border-border">
            <p className="text-xs font-semibold mb-3">{t.delivery.trackDelivery}</p>
            <div className="space-y-2">
              {statusHistory.map((sh, i) => (
                <div key={sh.id} className="flex items-center gap-3">
                  <div className={cn('w-2 h-2 rounded-full', i === statusHistory.length - 1 ? 'bg-accent' : 'bg-border')} />
                  <div className="flex-1">
                    <p className="text-xs font-medium">{sh.status.replace(/_/g, ' ')}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(sh.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
