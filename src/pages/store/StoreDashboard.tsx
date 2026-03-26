import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { BottomNav, storeNavItems } from '@/components/BottomNav';
import { NotificationBell } from '@/components/NotificationBell';
import { Button } from '@/components/ui/button';
import { Plus, Package, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';

export default function StoreDashboard() {
  const { t } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [activeDeliveries, setActiveDeliveries] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, completed: 0 });

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/', { replace: true }); return; }
    const fetchDeliveries = async () => {
      const { data } = await supabase.from('deliveries')
        .select('*')
        .eq('store_user_id', user.id)
        .not('status', 'in', '("delivered","cancelled")')
        .order('created_at', { ascending: false })
        .limit(10);
      if (data) setActiveDeliveries(data);

      const { count: total } = await supabase.from('deliveries')
        .select('*', { count: 'exact', head: true })
        .eq('store_user_id', user.id);
      const { count: completed } = await supabase.from('deliveries')
        .select('*', { count: 'exact', head: true })
        .eq('store_user_id', user.id)
        .eq('status', 'delivered');

      setStats({
        total: total || 0,
        active: data?.length || 0,
        completed: completed || 0,
      });
    };
    fetchDeliveries();

    const channel = supabase
      .channel('store-deliveries')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deliveries', filter: `store_user_id=eq.${user.id}` }, () => { fetchDeliveries(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  return (
    <div className="min-h-screen bg-background pb-20 safe-top">
      <div className="px-5 pt-6 pb-3 flex items-center justify-between">
        <h1 className="text-2xl font-bold">توصيل</h1>
        <NotificationBell />
      </div>

      {/* Stats */}
      <div className="px-5 mb-4 grid grid-cols-3 gap-2">
        {[
          { label: t.store.activeDeliveries, value: stats.active },
          { label: t.admin.totalDeliveries, value: stats.total },
          { label: t.delivery.delivered, value: stats.completed },
        ].map(({ label, value }) => (
          <div key={label} className="bg-card rounded-xl p-3 border border-border text-center">
            <p className="text-xl font-bold">{value}</p>
            <p className="text-[10px] text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {/* Create button */}
      <div className="px-5 mb-4">
        <motion.div whileTap={{ scale: 0.98 }}>
          <Button
            onClick={() => navigate('/store/create')}
            className="w-full h-14 text-base font-bold rounded-2xl gap-2"
          >
            <Plus className="w-5 h-5" />
            {t.store.createDelivery}
          </Button>
        </motion.div>
      </div>

      {/* Active deliveries */}
      <div className="px-5 space-y-3">
        {activeDeliveries.length === 0 ? (
          <div className="text-center py-8">
            <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">{t.store.noActiveDeliveries}</p>
          </div>
        ) : (
          activeDeliveries.map(d => (
            <motion.div
              key={d.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(`/store/track/${d.id}`)}
              className="bg-card rounded-xl p-4 border border-border cursor-pointer active:bg-secondary transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-accent uppercase">
                  {d.status.replace(/_/g, ' ')}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(d.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-3.5 h-3.5 text-destructive shrink-0" />
                <span className="truncate">{d.dropoff_address}</span>
              </div>
            </motion.div>
          ))
        )}
      </div>

      <BottomNav items={storeNavItems} />
    </div>
  );
}
