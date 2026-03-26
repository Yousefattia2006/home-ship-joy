import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Banknote, Phone } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { GoogleMapView } from '@/components/GoogleMap';
import { AddressPickerSheet } from '@/components/AddressPickerSheet';
import { DeliveryPriceBar } from '@/components/DeliveryPriceBar';
import { useDeliveryPrice } from '@/hooks/useDeliveryPrice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface LocationData {
  address: string;
  lat: number | null;
  lng: number | null;
}

export default function CreateDelivery() {
  const { t } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/auth', { replace: true }); }
  }, [user, authLoading, navigate]);

  const [pickup, setPickup] = useState<LocationData>({ address: '', lat: null, lng: null });
  const [dropoff, setDropoff] = useState<LocationData>({ address: '', lat: null, lng: null });
  const [manualDropoff, setManualDropoff] = useState('');
  const [notes] = useState('');
  const [isCash, setIsCash] = useState(false);
  const [cashAmount, setCashAmount] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  
  const [loading, setLoading] = useState(false);

  const [pickerOpen, setPickerOpen] = useState<'pickup' | 'dropoff' | null>(null);

  // Auto-fill pickup from store profile
  useEffect(() => {
    if (!user) return;
    supabase.from('store_profiles').select('address, lat, lng').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => {
        if (data?.address) {
          setPickup({ address: data.address, lat: data.lat, lng: data.lng });
        }
      });
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      const { data: newDelivery, error } = await supabase.from('deliveries').insert({
        store_user_id: user.id,
        pickup_address: pickup.address,
        pickup_lat: pickup.lat,
        pickup_lng: pickup.lng,
        dropoff_address: dropoff.address || manualDropoff,
        dropoff_lat: dropoff.lat,
        dropoff_lng: dropoff.lng,
        notes: customerPhone ? `Phone: ${customerPhone}${notes ? ' | ' + notes : ''}` : (notes || null),
        customer_phone: customerPhone || null,
        vehicle_type: 'motorcycle' as const,
        cash_amount: isCash && cashAmount ? parseFloat(cashAmount) : 0,
        status: 'finding_driver',
        dispatch_mode: 'standard',
        payout_amount: price.finalPrice || 0,
      }).select().single();
      if (error) throw error;

      // Record initial status
      if (newDelivery) {
        await supabase.from('order_status_history').insert({
          delivery_id: newDelivery.id,
          status: 'finding_driver',
          changed_by: user.id,
        });
      }

      toast.success(t.common.success);
      navigate(`/store/track/${newDelivery.id}`);
    } catch (err: any) {
      toast.error(err.message || t.common.error);
    } finally {
      setLoading(false);
    }
  };

  const pickupCoords = pickup.lat && pickup.lng ? { lat: pickup.lat, lng: pickup.lng } : null;
  const dropoffCoords = dropoff.lat && dropoff.lng ? { lat: dropoff.lat, lng: dropoff.lng } : null;

  const price = useDeliveryPrice(pickupCoords, dropoffCoords);

  return (
    <div className="min-h-screen bg-background safe-top pb-32">
      <div className="px-5 pt-6 pb-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-secondary">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold">{t.store.createDelivery}</h1>
      </div>

      <GoogleMapView
        className="mx-5 h-60 mb-4"
        pickupLocation={pickupCoords}
        dropoffLocation={dropoffCoords}
        pickupLabel="P"
        dropoffLabel="D"
        showCurrentLocationBtn
        routePath={price.routePath}
      />

      <form onSubmit={handleSubmit} className="px-5 pb-8 space-y-4">
        {/* Pickup */}
        <button
          type="button"
          onClick={() => setPickerOpen('pickup')}
          className="flex items-center gap-3 w-full h-12 px-3 rounded-md border border-input bg-background text-left"
        >
          <MapPin className="w-4 h-4 text-accent shrink-0" />
          <span className={cn('text-base truncate', !pickup.address && 'text-muted-foreground')}>
            {pickup.address || t.store.pickupAddress}
          </span>
        </button>

        {/* Dropoff */}
        <button
          type="button"
          onClick={() => setPickerOpen('dropoff')}
          className="flex items-center gap-3 w-full h-12 px-3 rounded-md border border-input bg-background text-left"
        >
          <MapPin className="w-4 h-4 text-destructive shrink-0" />
          <span className={cn('text-base truncate', !dropoff.address && 'text-muted-foreground')}>
            {dropoff.address || t.store.dropoffAddress}
          </span>
        </button>

        {/* Manual dropoff */}
        <div className="relative">
          <MapPin className="absolute left-3 top-3.5 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t.store.manualDropoff}
            value={manualDropoff}
            onChange={(e) => { setManualDropoff(e.target.value); if (dropoff.address) setDropoff({ address: '', lat: null, lng: null }); }}
            className="h-12 pl-10 text-base"
          />
        </div>

        {/* Cash Payment */}
        <div className="space-y-3">
          <label className="text-sm font-medium">{t.store.isCashPayment}</label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: true, label: t.store.yes },
              { value: false, label: t.store.no },
            ].map(({ value, label }) => (
              <button
                key={String(value)}
                type="button"
                onClick={() => { setIsCash(value); if (!value) setCashAmount(''); }}
                className={cn(
                  'py-3 rounded-xl border-2 transition-all text-sm font-semibold',
                  isCash === value
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-border hover:border-muted-foreground'
                )}
              >
                {label}
              </button>
            ))}
          </div>
          {isCash && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="relative"
            >
              <Banknote className="absolute left-3 top-3.5 w-4 h-4 text-accent" />
              <Input
                placeholder={t.store.cashAmountPlaceholder}
                value={cashAmount}
                onChange={(e) => setCashAmount(e.target.value)}
                type="number"
                min="0"
                className="h-12 pl-10 text-base"
              />
            </motion.div>
          )}
        </div>

        {/* Customer Phone */}
        <div className="space-y-2">
          <label className="text-sm font-medium">{t.store.customerPhone}</label>
          <div className="relative">
            <Phone className="absolute left-3 top-3.5 w-4 h-4 text-primary" />
            <Input
              placeholder={t.store.customerPhonePlaceholder}
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              type="tel"
              className="h-12 pl-10 text-base"
            />
          </div>
        </div>

        <motion.div whileTap={{ scale: 0.98 }}>
          <Button
            type="submit"
            disabled={loading || !pickup.address || (!dropoff.address && !manualDropoff) || price.outOfZone}
            className="w-full h-14 text-base font-bold rounded-2xl"
          >
            {loading ? t.common.loading : t.store.requestDriver}
          </Button>
        </motion.div>
      </form>

      <AddressPickerSheet
        open={pickerOpen === 'pickup'}
        onClose={() => setPickerOpen(null)}
        onSelect={(address, lat, lng) => setPickup({ address, lat, lng })}
        title={t.addressPicker?.pickupTitle || 'Pickup Location'}
        type="pickup"
      />

      <AddressPickerSheet
        open={pickerOpen === 'dropoff'}
        onClose={() => setPickerOpen(null)}
        onSelect={(address, lat, lng) => { setDropoff({ address, lat, lng }); setManualDropoff(''); }}
        title={t.addressPicker?.dropoffTitle || 'Dropoff Location'}
        type="dropoff"
      />

      <DeliveryPriceBar
        loading={price.loading}
        finalPrice={price.finalPrice}
        distanceKm={price.distanceKm}
        hasLocations={!!(pickupCoords && (dropoffCoords || manualDropoff))}
        error={price.error}
        outOfZone={price.outOfZone}
      />
    </div>
  );
}
