import { useState, useEffect } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { BottomNav, driverNavItems } from '@/components/BottomNav';
import { Wallet, Package, Calendar, ArrowUpCircle } from 'lucide-react';

export default function DriverPayments() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [weekStats, setWeekStats] = useState({ count: 0, earned: 0 });

  useEffect(() => {
    if (!user) return;
    supabase.from('driver_profiles').select('*').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => { if (data) setProfile(data); });

    // Fetch completed deliveries
    supabase.from('deliveries').select('*')
      .eq('driver_user_id', user.id)
      .eq('status', 'delivered')
      .order('delivered_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (data) {
          setDeliveries(data);
          // Calculate last week stats
          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
          const weekDeliveries = data.filter(d => new Date(d.delivered_at) >= oneWeekAgo);
          setWeekStats({
            count: weekDeliveries.length,
            earned: weekDeliveries.reduce((sum, d) => sum + (d.payout_amount || 0), 0),
          });
        }
      });
  }, [user]);

  const totalEarned = deliveries.reduce((sum, d) => sum + (d.payout_amount || 0), 0);

  return (
    <div className="min-h-screen bg-background pb-20 safe-top">
      <div className="px-5 pt-6 pb-4">
        <h1 className="text-2xl font-bold">{t.nav.payments}</h1>
      </div>

      {/* Total Earned */}
      <div className="mx-5 mb-4 bg-card rounded-2xl border border-border p-6 text-center">
        <Wallet className="w-8 h-8 mx-auto mb-2 text-accent" />
        <p className="text-xs text-muted-foreground mb-1">{t.payments.totalEarned}</p>
        <p className="text-4xl font-black">{totalEarned} <span className="text-lg font-medium text-muted-foreground">{t.common.egp}</span></p>
      </div>

      {/* Upcoming Transfer */}
      <div className="mx-5 mb-4 bg-card rounded-2xl border border-border p-5">
        <div className="flex items-center gap-3 mb-2">
          <ArrowUpCircle className="w-5 h-5 text-accent" />
          <p className="text-sm font-semibold">{t.payments.upcomingTransfer}</p>
        </div>
        <p className="text-2xl font-bold">{profile?.balance || 0} {t.common.egp}</p>
        <p className="text-xs text-muted-foreground mt-1">{t.payments.transferDate}</p>
      </div>

      {/* Last Week Summary */}
      <div className="mx-5 mb-4 grid grid-cols-2 gap-3">
        <div className="bg-card rounded-2xl border border-border p-4 text-center">
          <Package className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
          <p className="text-2xl font-bold">{weekStats.count}</p>
          <p className="text-[10px] text-muted-foreground">{t.payments.deliveriesCompleted}</p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-4 text-center">
          <Wallet className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
          <p className="text-2xl font-bold">{weekStats.earned}</p>
          <p className="text-[10px] text-muted-foreground">{t.payments.totalEarnedWeek}</p>
        </div>
      </div>

      {/* Delivery History */}
      <div className="px-5">
        <h2 className="text-sm font-semibold text-muted-foreground mb-3">{t.payments.deliveryHistory}</h2>
        {deliveries.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">{t.payments.noDeliveries}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {deliveries.map((d) => (
              <div key={d.id} className="bg-card rounded-xl p-4 border border-border flex items-center gap-3">
                <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{d.dropoff_address}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {d.delivered_at ? new Date(d.delivered_at).toLocaleDateString() : ''}
                  </p>
                </div>
                <p className="text-sm font-bold text-accent">
                  {d.payout_amount || 0} {t.common.egp}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav items={driverNavItems} />
    </div>
  );
}
