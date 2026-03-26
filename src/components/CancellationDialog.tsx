import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface CancellationDialogProps {
  delivery: any;
  role: 'store' | 'driver';
  onCancelled: () => void;
  children: React.ReactNode;
}

export function CancellationDialog({ delivery, role, onCancelled, children }: CancellationDialogProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [selectedReason, setSelectedReason] = useState('');
  const [loading, setLoading] = useState(false);

  const cancellationReasons = role === 'store'
    ? [
        t.cancellation?.storeReasons?.tooLong || 'Taking too long',
        t.cancellation?.storeReasons?.wrongOrder || 'Wrong order details',
        t.cancellation?.storeReasons?.customerCancelled || 'Customer cancelled',
        t.cancellation?.storeReasons?.other || 'Other',
      ]
    : [
        t.cancellation?.driverReasons?.cantFind || "Can't find the store",
        t.cancellation?.driverReasons?.emergency || 'Emergency',
        t.cancellation?.driverReasons?.vehicleIssue || 'Vehicle issue',
        t.cancellation?.driverReasons?.other || 'Other',
      ];

  const isDriverArrived = ['arriving_pickup', 'picked_up'].includes(delivery.status);

  // Calculate if driver waited 3+ minutes (for store cancellation penalty)
  const driverArrivedAt = delivery.status === 'arriving_pickup' ? delivery.updated_at : null;
  const driverWaitMinutes = driverArrivedAt
    ? (Date.now() - new Date(driverArrivedAt).getTime()) / 60000
    : 0;

  const hasPenalty = isDriverArrived && (
    (role === 'store' && driverWaitMinutes >= 3) ||
    (role === 'driver')
  );

  const handleCancel = async () => {
    if (!user || !selectedReason) return;
    setLoading(true);
    try {
      // Update delivery status
      await supabase.from('deliveries').update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
      }).eq('id', delivery.id);

      // Record cancellation
      await supabase.from('cancellations').insert({
        delivery_id: delivery.id,
        cancelled_by: user.id,
        cancelled_by_role: role,
        reason: selectedReason === 'Other' ? reason : selectedReason,
        penalty_amount: hasPenalty ? 10 : 0,
        penalty_to: hasPenalty ? (role === 'store' ? 'driver' : 'platform') : null,
        driver_arrived_at: driverArrivedAt,
        driver_wait_minutes: driverWaitMinutes,
      });

      // Apply penalty logic
      if (hasPenalty && role === 'store' && delivery.driver_user_id) {
        // Store cancellation after driver arrival + 3 min wait: 10 EGP to driver
        await supabase.from('driver_balance_transactions').insert({
          driver_user_id: delivery.driver_user_id,
          type: 'cancellation_compensation',
          amount: 10,
          delivery_id: delivery.id,
          description: t.cancellation?.compensationDesc || 'Cancellation compensation',
        });
        await supabase.from('driver_profiles')
          .update({ balance: (await supabase.from('driver_profiles').select('balance').eq('user_id', delivery.driver_user_id).single()).data?.balance + 10 })
          .eq('user_id', delivery.driver_user_id);
      }

      if (hasPenalty && role === 'driver') {
        // Driver cancellation after arrival: 10 EGP deduction
        await supabase.from('driver_balance_transactions').insert({
          driver_user_id: user.id,
          type: 'cancellation_penalty',
          amount: -10,
          delivery_id: delivery.id,
          description: t.cancellation?.penaltyDesc || 'Cancellation penalty',
        });
        const { data: dp } = await supabase.from('driver_profiles').select('balance').eq('user_id', user.id).single();
        if (dp) {
          await supabase.from('driver_profiles')
            .update({ balance: dp.balance - 10 })
            .eq('user_id', user.id);
        }
      }

      // Send notification
      if (delivery.driver_user_id && role === 'store') {
        await supabase.from('notifications').insert({
          user_id: delivery.driver_user_id,
          title: t.cancellation?.storeCancelledTitle || 'Order Cancelled',
          body: t.cancellation?.storeCancelledBody || 'The store cancelled the order.',
          type: 'cancellation',
          delivery_id: delivery.id,
        });
      }
      if (delivery.store_user_id && role === 'driver') {
        await supabase.from('notifications').insert({
          user_id: delivery.store_user_id,
          title: t.cancellation?.driverCancelledTitle || 'Driver Cancelled',
          body: t.cancellation?.driverCancelledBody || 'The driver cancelled the order.',
          type: 'cancellation',
          delivery_id: delivery.id,
        });
      }

      toast.success(t.cancellation?.cancelled || 'Order cancelled');
      setOpen(false);
      onCancelled();
    } catch (err: any) {
      toast.error(err.message || t.common.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            {t.cancellation?.title || 'Cancel Order'}
          </DialogTitle>
        </DialogHeader>

        {hasPenalty && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-3 text-sm">
            <p className="font-semibold text-destructive">
              {role === 'store'
                ? (t.cancellation?.storePenaltyWarning || '10 EGP will be deducted and given to the driver as compensation.')
                : (t.cancellation?.driverPenaltyWarning || '10 EGP will be deducted from your next payout.')
              }
            </p>
          </div>
        )}

        <div className="space-y-2">
          <p className="text-sm font-medium">{t.cancellation?.selectReason || 'Select a reason'}</p>
          {cancellationReasons.map(r => (
            <button
              key={r}
              onClick={() => setSelectedReason(r)}
              className={cn(
                'w-full text-left px-4 py-3 rounded-xl border-2 text-sm transition-all',
                selectedReason === r
                  ? 'border-foreground bg-foreground text-background'
                  : 'border-border hover:border-muted-foreground'
              )}
            >
              {r}
            </button>
          ))}
        </div>

        {selectedReason === (t.cancellation?.storeReasons?.other || 'Other') ||
         selectedReason === (t.cancellation?.driverReasons?.other || 'Other') ? (
          <Textarea
            placeholder={t.cancellation?.reasonPlaceholder || 'Describe the reason...'}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="min-h-[60px]"
          />
        ) : null}

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} className="flex-1">
            {t.common.back}
          </Button>
          <Button
            variant="destructive"
            onClick={handleCancel}
            disabled={!selectedReason || loading}
            className="flex-1"
          >
            {loading ? t.common.loading : (t.cancellation?.confirmCancel || 'Confirm Cancel')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
