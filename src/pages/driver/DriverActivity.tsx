import { useState, useEffect } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { BottomNav, driverNavItems } from '@/components/BottomNav';
import { StatusBadge } from '@/components/StatusBadge';
import { Package } from 'lucide-react';

export default function DriverActivity() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [deliveries, setDeliveries] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from('deliveries').select('*')
      .eq('driver_user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => { if (data) setDeliveries(data); });
  }, [user]);

  return (
    <div className="min-h-screen bg-background pb-20 safe-top">
      <div className="px-5 pt-6 pb-4">
        <h1 className="text-2xl font-bold">{t.nav.activity}</h1>
      </div>

      <div className="px-5 space-y-3">
        {deliveries.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">{t.store.noDeliveriesYet}</p>
          </div>
        ) : (
          deliveries.map((d) => (
            <div key={d.id} className="bg-card rounded-xl p-4 border border-border">
              <div className="flex items-start justify-between mb-2">
                <StatusBadge status={d.status} />
                <span className="text-[10px] text-muted-foreground">
                  {new Date(d.created_at).toLocaleDateString()}
                </span>
              </div>
              <p className="text-sm font-medium truncate">{d.dropoff_address}</p>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{d.pickup_address}</p>
            </div>
          ))
        )}
      </div>

      <BottomNav items={driverNavItems} />
    </div>
  );
}
