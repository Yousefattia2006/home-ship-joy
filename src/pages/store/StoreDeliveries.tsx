import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { BottomNav, storeNavItems } from '@/components/BottomNav';
import { StatusBadge } from '@/components/StatusBadge';
import { Package } from 'lucide-react';

export default function StoreDeliveries() {
  const { t } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [tab, setTab] = useState<'active' | 'history'>('active');

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/', { replace: true }); return; }
    supabase
      .from('deliveries')
      .select('*')
      .eq('store_user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => { if (data) setDeliveries(data); });
  }, [user]);

  const filtered = deliveries.filter(d =>
    tab === 'active'
      ? !['delivered', 'cancelled'].includes(d.status)
      : ['delivered', 'cancelled'].includes(d.status)
  );

  return (
    <div className="min-h-screen bg-background pb-20 safe-top">
      <div className="px-5 pt-6 pb-4">
        <h1 className="text-2xl font-bold">{t.store.myDeliveries}</h1>
      </div>

      {/* Tabs */}
      <div className="px-5 mb-4 flex gap-2">
        {(['active', 'history'] as const).map((key) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              tab === key ? 'bg-foreground text-background' : 'bg-secondary text-muted-foreground'
            }`}
          >
            {key === 'active' ? t.store.activeDeliveries : t.store.history}
          </button>
        ))}
      </div>

      <div className="px-5 space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">{t.store.noDeliveries}</p>
          </div>
        ) : (
          filtered.map((d) => (
            <div
              key={d.id}
              onClick={() => navigate(`/store/track/${d.id}`)}
              className="bg-card rounded-xl p-4 border border-border active:bg-secondary transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between mb-2">
                <StatusBadge status={d.status} />
                <span className="text-[10px] text-muted-foreground">
                  {new Date(d.created_at).toLocaleDateString()}
                </span>
              </div>
              <p className="text-sm font-medium truncate">{d.dropoff_address}</p>
            </div>
          ))
        )}
      </div>

      <BottomNav items={storeNavItems} />
    </div>
  );
}
