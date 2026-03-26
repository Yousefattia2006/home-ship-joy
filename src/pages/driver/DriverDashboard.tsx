import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { BottomNav, driverNavItems } from '@/components/BottomNav';
import { GoogleMapView } from '@/components/GoogleMap';

import { NotificationBell } from '@/components/NotificationBell';
import { ChatSheet } from '@/components/ChatSheet';
import { CancellationDialog } from '@/components/CancellationDialog';
import { ReportDialog } from '@/components/ReportDialog';
import { Button } from '@/components/ui/button';
import { sendOrderStatusNotification } from '@/hooks/useNotifications';
import { MapPin, Bike, Wallet, Package, Star, Lock, Phone, Flag, XCircle, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function DriverDashboard() {
  const { t } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [driverStatus, setDriverStatus] = useState<'offline' | 'online' | 'on_delivery' | 'on_break'>('offline');
  const [driverProfile, setDriverProfile] = useState<any>(null);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [activeDelivery, setActiveDelivery] = useState<any>(null);
  const [storeProfile, setStoreProfile] = useState<any>(null);
  const [gateLoading, setGateLoading] = useState(true);
  const [deliveryPhotoUrl, setDeliveryPhotoUrl] = useState<string | null>(null);
  const [isWithin50m, setIsWithin50m] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/', { replace: true });
      return;
    }
    const check = async () => {
      const { data: profile } = await supabase.from('driver_profiles')
        .select('*').eq('user_id', user.id).maybeSingle();
      if (!profile || !profile.onboarding_completed) {
        navigate('/driver/onboarding', { replace: true }); return;
      }
      if (profile.approval_status !== 'approved') {
        navigate('/driver/status', { replace: true }); return;
      }
      const { data: payout } = await supabase.from('driver_payout_methods')
        .select('id').eq('driver_user_id', user.id).maybeSingle();
      if (!payout) {
        navigate('/driver/payout', { replace: true }); return;
      }
      setDriverProfile(profile);
      setDriverStatus((profile.driver_status || (profile.is_online ? 'online' : 'offline')) as any);
      setGateLoading(false);
    };
    check();
  }, [user, authLoading, navigate]);

  // Fetch active delivery + store info
  useEffect(() => {
    if (!user || gateLoading) return;
    supabase.from('deliveries').select('*')
      .eq('driver_user_id', user.id)
      .not('status', 'in', '("delivered","cancelled")')
      .maybeSingle()
      .then(async ({ data }) => {
        if (data) {
          setActiveDelivery(data);
          setDriverStatus('on_delivery');
          const { data: sp } = await supabase.from('store_profiles')
            .select('store_name, phone').eq('user_id', data.store_user_id).maybeSingle();
          if (sp) setStoreProfile(sp);
        }
      });
  }, [user, gateLoading]);

  // Realtime listener for active delivery cancellation
  useEffect(() => {
    if (!activeDelivery) return;
    const channel = supabase
      .channel(`active-delivery-${activeDelivery.id}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'deliveries',
        filter: `id=eq.${activeDelivery.id}`
      }, (payload: any) => {
        const updated = payload.new;
        if (updated.status === 'cancelled') {
          setActiveDelivery(null);
          setStoreProfile(null);
          setDriverStatus('online');
          toast.error(t.cancellation?.storeCancelledBody || 'The store cancelled the order.');
        } else {
          setActiveDelivery(updated);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeDelivery?.id]);

  // Check proximity to dropoff for proof of delivery
  useEffect(() => {
    if (!activeDelivery || activeDelivery.status !== 'en_route') return;
    if (!activeDelivery.dropoff_lat || !activeDelivery.dropoff_lng) return;

    const checkProximity = () => {
      navigator.geolocation.getCurrentPosition((pos) => {
        const R = 6371e3;
        const lat1 = pos.coords.latitude * Math.PI / 180;
        const lat2 = activeDelivery.dropoff_lat * Math.PI / 180;
        const dLat = (activeDelivery.dropoff_lat - pos.coords.latitude) * Math.PI / 180;
        const dLng = (activeDelivery.dropoff_lng - pos.coords.longitude) * Math.PI / 180;
        const a = Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLng/2)**2;
        const d = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        setIsWithin50m(d <= 50);
      });
    };
    checkProximity();
    const interval = setInterval(checkProximity, 10000);
    return () => clearInterval(interval);
  }, [activeDelivery]);

  // Realtime delivery requests
  useEffect(() => {
    if (driverStatus !== 'online' || !user || !driverProfile) return;
    const fetchPending = async () => {
      const { data } = await supabase.from('deliveries')
        .select('*')
        .eq('status', 'finding_driver')
        .eq('vehicle_type', driverProfile.vehicle_type)
        .is('driver_user_id', null)
        .limit(5);
      if (data) setPendingRequests(data);
    };
    fetchPending();
    const channel = supabase
      .channel('driver-requests')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deliveries' }, () => { fetchPending(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [driverStatus, user, driverProfile]);

  // Location tracking while online/on delivery
  useEffect(() => {
    if (!user || (driverStatus !== 'online' && driverStatus !== 'on_delivery')) return;
    const watchId = navigator.geolocation.watchPosition(async (pos) => {
      await supabase.from('driver_profiles').update({
        current_lat: pos.coords.latitude,
        current_lng: pos.coords.longitude,
        last_active_at: new Date().toISOString(),
      }).eq('user_id', user.id);

      if (activeDelivery) {
        await supabase.from('driver_locations').insert({
          driver_user_id: user.id,
          delivery_id: activeDelivery.id,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      }
    }, () => {}, { enableHighAccuracy: true, maximumAge: 10000 });
    return () => navigator.geolocation.clearWatch(watchId);
  }, [user, driverStatus, activeDelivery]);

  const isTrialExpired = driverProfile && driverProfile.trial_deliveries_completed >= 10;
  const isBalanceLocked = isTrialExpired && driverProfile.balance <= 0;

  const changeStatus = async (newStatus: 'online' | 'offline' | 'on_break') => {
    if (!user || !driverProfile) return;
    if (isBalanceLocked && newStatus === 'online') {
      toast.error(t.driver.balanceLocked);
      return;
    }
    const isOnline = newStatus === 'online';
    await supabase.from('driver_profiles').update({
      is_online: isOnline,
      driver_status: newStatus,
    }).eq('user_id', user.id);
    setDriverStatus(newStatus);
  };

  const acceptDelivery = async (deliveryId: string) => {
    if (!user) return;
    const { error } = await supabase.from('deliveries')
      .update({ driver_user_id: user.id, status: 'driver_accepted', accepted_at: new Date().toISOString() })
      .eq('id', deliveryId)
      .eq('status', 'finding_driver');
    if (error) { toast.error(t.common.error); return; }
    setPendingRequests(prev => prev.filter(r => r.id !== deliveryId));
    const { data } = await supabase.from('deliveries').select('*').eq('id', deliveryId).maybeSingle();
    if (data) {
      setActiveDelivery(data);
      setDriverStatus('on_delivery');
      await supabase.from('driver_profiles').update({ driver_status: 'on_delivery' }).eq('user_id', user.id);
      // Notify store
      await sendOrderStatusNotification(data, 'driver_accepted', t.cancellation);
      // Fetch store info
      const { data: sp } = await supabase.from('store_profiles')
        .select('store_name, phone').eq('user_id', data.store_user_id).maybeSingle();
      if (sp) setStoreProfile(sp);
    }
    toast.success(t.delivery.accepted);
  };

  const handleDeliveryPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeDelivery || !user) return;
    const path = `delivery-proofs/${activeDelivery.id}/${Date.now()}.jpg`;
    const { error } = await supabase.storage.from('driver-documents').upload(path, file);
    if (error) { toast.error(t.common.error); return; }
    const { data: urlData } = supabase.storage.from('driver-documents').getPublicUrl(path);
    setDeliveryPhotoUrl(urlData.publicUrl);
    await supabase.from('deliveries').update({ delivery_photo_url: urlData.publicUrl }).eq('id', activeDelivery.id);
    toast.success(t.common.success);
  };

  const updateDeliveryStatus = async (newStatus: string) => {
    if (!activeDelivery || !user || !driverProfile) return;

    // For delivered status, require delivery photo
    if (newStatus === 'delivered' && !deliveryPhotoUrl && !activeDelivery.delivery_photo_url) {
      toast.error(t.proofOfDelivery?.photoRequired || 'Delivery photo required');
      return;
    }

    const updates: any = { status: newStatus };
    if (newStatus === 'picked_up') updates.picked_up_at = new Date().toISOString();
    if (newStatus === 'delivered') {
      updates.delivered_at = new Date().toISOString();
      const isTrial = driverProfile.trial_deliveries_completed < 10;
      const commission = isTrial ? 0 : driverProfile.commission_per_delivery;
      updates.commission_amount = commission;
    }

    await supabase.from('deliveries').update(updates).eq('id', activeDelivery.id);

    // Record status history
    await supabase.from('order_status_history').insert({
      delivery_id: activeDelivery.id,
      status: newStatus,
      changed_by: user.id,
    });

    // Send notification
    await sendOrderStatusNotification(activeDelivery, newStatus, t.cancellation);

    if (newStatus === 'delivered') {
      const isTrial = driverProfile.trial_deliveries_completed < 10;
      const commission = isTrial ? 0 : driverProfile.commission_per_delivery;
      const newBalance = driverProfile.balance - commission;
      const newTrialCount = driverProfile.trial_deliveries_completed + 1;
      const newTotalDeliveries = (driverProfile.total_deliveries || 0) + 1;

      await supabase.from('driver_profiles').update({
        balance: newBalance,
        trial_deliveries_completed: newTrialCount,
        total_deliveries: newTotalDeliveries,
        driver_status: 'online',
        is_online: true,
      }).eq('user_id', user.id);

      if (commission > 0) {
        await supabase.from('driver_balance_transactions').insert({
          driver_user_id: user.id,
          type: 'commission',
          amount: -commission,
          delivery_id: activeDelivery.id,
          description: t.admin.commissionForDelivery,
        });
      }

      setDriverProfile((prev: any) => ({
        ...prev,
        balance: newBalance,
        trial_deliveries_completed: newTrialCount,
        total_deliveries: newTotalDeliveries,
      }));
      setActiveDelivery(null);
      setStoreProfile(null);
      setDeliveryPhotoUrl(null);
      setDriverStatus('online');
      toast.success(t.delivery.delivered);
    } else {
      setActiveDelivery({ ...activeDelivery, ...updates });
    }
  };

  const statusActions: Record<string, { label: string; next: string }> = {
    driver_accepted: { label: t.driver.arrivedPickup, next: 'arriving_pickup' },
    arriving_pickup: { label: t.driver.pickedUp, next: 'picked_up' },
    picked_up: { label: t.driver.arrivedDropoff, next: 'en_route' },
    en_route: { label: t.driver.delivered, next: 'delivered' },
  };

  if (gateLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse-dot w-4 h-4 rounded-full bg-accent" />
      </div>
    );
  }

  const trialRemaining = driverProfile ? Math.max(0, 10 - driverProfile.trial_deliveries_completed) : 10;

  const statusColors: Record<string, string> = {
    online: 'text-accent',
    offline: 'text-muted-foreground',
    on_delivery: 'text-primary',
    on_break: 'text-warning',
  };

  const statusLabels: Record<string, string> = {
    online: t.driverStatus?.online || 'Online',
    offline: t.driverStatus?.offline || 'Offline',
    on_delivery: t.driverStatus?.onDelivery || 'On Delivery',
    on_break: t.driverStatus?.onBreak || 'Taking a Break',
  };

  return (
    <div className="min-h-screen bg-background pb-20 safe-top flex flex-col">
      <div className="px-5 pt-6 pb-3 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">توصيل</h1>
          <p className={cn('text-xs font-semibold', statusColors[driverStatus])}>
            {statusLabels[driverStatus]}
          </p>
        </div>
        <NotificationBell />
      </div>

      {/* Stats Row */}
      {driverProfile && (
        <div className="px-5 mb-4 grid grid-cols-4 gap-2">
          {[
            { icon: Package, label: t.driver.totalDeliveries, value: driverProfile.total_deliveries || 0 },
            { icon: Star, label: t.driver.trialRemaining, value: `${trialRemaining}/10` },
            { icon: Wallet, label: t.driver.balance, value: `${driverProfile.balance}` },
            { icon: Star, label: t.admin.driverRating, value: driverProfile.rating?.toFixed(1) || '5.0' },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="bg-card rounded-xl p-2.5 border border-border text-center">
              <Icon className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
              <p className="text-lg font-bold">{value}</p>
              <p className="text-[9px] text-muted-foreground leading-tight">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Balance Locked Banner */}
      {isBalanceLocked && (
        <div className="mx-5 mb-4 bg-destructive/10 border border-destructive/30 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Lock className="w-5 h-5 text-destructive flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold">{t.driver.trialComplete}</p>
              <p className="text-xs text-muted-foreground">{t.driver.balanceLocked}</p>
            </div>
          </div>
          <Button onClick={() => navigate('/driver/wallet')} className="w-full h-10 font-bold rounded-xl text-sm">
            {t.driver.topUp}
          </Button>
        </div>
      )}

      <GoogleMapView
        className="mx-5 flex-1 min-h-[180px] mb-4"
        showDriver={driverStatus === 'online' || driverStatus === 'on_delivery'}
        pickupLocation={activeDelivery ? { lat: activeDelivery.pickup_lat, lng: activeDelivery.pickup_lng } : undefined}
        dropoffLocation={activeDelivery ? { lat: activeDelivery.dropoff_lat, lng: activeDelivery.dropoff_lng } : undefined}
        pickupLabel={activeDelivery ? 'Pickup' : undefined}
        dropoffLabel={activeDelivery ? 'Dropoff' : undefined}
      />

      {/* Active Delivery Card */}
      <AnimatePresence>
        {activeDelivery && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="mx-5 mb-4 bg-card rounded-2xl border border-border p-4 space-y-3"
          >
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-accent" />
              <span className="font-medium truncate">{activeDelivery.pickup_address}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-destructive" />
              <span className="font-medium truncate">{activeDelivery.dropoff_address}</span>
            </div>
            {activeDelivery.cash_amount > 0 && (
              <p className="text-xs font-semibold text-warning">💰 {t.admin.collect}: {activeDelivery.cash_amount} {t.common.egp}</p>
            )}
            {activeDelivery.notes && (
              <p className="text-xs text-muted-foreground">{activeDelivery.notes}</p>
            )}

            {/* Store contact + chat */}
            {storeProfile && (
              <div className="flex items-center gap-2 pt-1 border-t border-border">
                <div className="flex-1">
                  <p className="text-xs font-semibold">{storeProfile.store_name}</p>
                  <p className="text-[10px] text-muted-foreground">{storeProfile.phone}</p>
                </div>
                {storeProfile.phone && (
                  <a href={`tel:${storeProfile.phone}`}>
                    <Button size="icon" variant="outline" className="rounded-full h-9 w-9">
                      <Phone className="w-4 h-4" />
                    </Button>
                  </a>
                )}
                <ChatSheet deliveryId={activeDelivery.id} otherUserName={storeProfile.store_name} />
              </div>
            )}

            {/* Proof of delivery photo - only when en_route */}
            {activeDelivery.status === 'en_route' && (
              <div className="space-y-2">
                {!isWithin50m && !deliveryPhotoUrl && !activeDelivery.delivery_photo_url && (
                  <p className="text-xs text-warning text-center">{t.proofOfDelivery?.tooFar || 'You must be within 50m of the customer.'}</p>
                )}
                {(isWithin50m || deliveryPhotoUrl || activeDelivery.delivery_photo_url) && (
                  <label className="flex items-center justify-center gap-2 w-full h-12 rounded-xl border-2 border-dashed border-accent cursor-pointer hover:bg-accent/5">
                    <Camera className="w-4 h-4 text-accent" />
                    <span className="text-sm font-medium text-accent">
                      {deliveryPhotoUrl || activeDelivery.delivery_photo_url
                        ? '✓ ' + (t.common.success)
                        : (t.proofOfDelivery?.takePhoto || 'Take Delivery Photo')}
                    </span>
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleDeliveryPhoto} />
                  </label>
                )}
              </div>
            )}

            {/* Status action button */}
            {statusActions[activeDelivery.status] && (
              <Button
                onClick={() => updateDeliveryStatus(statusActions[activeDelivery.status].next)}
                className="w-full h-14 text-base font-bold rounded-xl"
                disabled={activeDelivery.status === 'en_route' && !deliveryPhotoUrl && !activeDelivery.delivery_photo_url}
              >
                {statusActions[activeDelivery.status].label}
              </Button>
            )}

            {/* Cancel + Report */}
            <div className="flex gap-2">
              <CancellationDialog
                delivery={activeDelivery}
                role="driver"
                onCancelled={() => {
                  setActiveDelivery(null);
                  setStoreProfile(null);
                  setDriverStatus('online');
                }}
              >
                <Button variant="outline" size="sm" className="flex-1 gap-1 rounded-xl text-destructive">
                  <XCircle className="w-3.5 h-3.5" /> {t.common.cancel}
                </Button>
              </CancellationDialog>
              <ReportDialog deliveryId={activeDelivery.id} role="driver">
                <Button variant="outline" size="sm" className="gap-1 rounded-xl">
                  <Flag className="w-3.5 h-3.5" /> {t.report?.title || 'Report'}
                </Button>
              </ReportDialog>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pending Requests */}
      <AnimatePresence>
        {!activeDelivery && driverStatus === 'online' && pendingRequests.map((req) => (
          <motion.div
            key={req.id}
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="mx-5 mb-3 bg-card rounded-2xl border border-border p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-accent uppercase">{t.driver.newRequest}</span>
              <Bike className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-accent flex-shrink-0" />
              <span className="truncate">{req.pickup_address}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-destructive flex-shrink-0" />
              <span className="truncate">{req.dropoff_address}</span>
            </div>
            {req.cash_amount > 0 && (
              <p className="text-xs font-semibold text-warning">💰 {req.cash_amount} {t.common.egp}</p>
            )}
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 h-12 font-bold rounded-xl"
                onClick={() => setPendingRequests(prev => prev.filter(r => r.id !== req.id))}
              >
                {t.driver.reject}
              </Button>
              <Button
                className="flex-1 h-12 font-bold rounded-xl"
                onClick={() => acceptDelivery(req.id)}
              >
                {t.driver.accept}
              </Button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Status Buttons */}
      {!activeDelivery && (
        <div className="px-5 mb-4 space-y-2">
          <div className="grid grid-cols-3 gap-2">
            {(['online', 'offline', 'on_break'] as const).map(s => (
              <motion.div key={s} whileTap={{ scale: 0.98 }}>
                <Button
                  onClick={() => changeStatus(s)}
                  disabled={isBalanceLocked && s === 'online'}
                  variant={driverStatus === s ? 'default' : 'outline'}
                  className={cn(
                    'w-full h-12 font-bold rounded-xl text-sm',
                    driverStatus === s && s === 'online' && 'bg-accent hover:bg-accent/90 text-accent-foreground',
                    driverStatus === s && s === 'on_break' && 'bg-warning hover:bg-warning/90 text-warning-foreground',
                  )}
                >
                  {statusLabels[s]}
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      <BottomNav items={driverNavItems} />
    </div>
  );
}
