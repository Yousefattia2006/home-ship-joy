import { useState, useEffect } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { BottomNav, driverNavItems } from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Wallet, ArrowUpCircle, ArrowDownCircle, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function DriverWallet() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [driverProfile, setDriverProfile] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [showTopUp, setShowTopUp] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('200');
  const [topUpMethod, setTopUpMethod] = useState<'instapay' | 'vodafone_cash'>('instapay');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from('driver_profiles').select('*').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => { if (data) setDriverProfile(data); });
    supabase.from('driver_balance_transactions').select('*').eq('driver_user_id', user.id)
      .order('created_at', { ascending: false }).limit(50)
      .then(({ data }) => { if (data) setTransactions(data); });
  }, [user]);

  const requestTopUp = async () => {
    if (!user) return;
    const amount = parseFloat(topUpAmount);
    if (isNaN(amount) || amount < 200) {
      toast.error(t.driver.minTopUp);
      return;
    }
    setLoading(true);
    try {
      await supabase.from('driver_balance_transactions').insert({
        driver_user_id: user.id,
        type: 'top_up',
        amount,
        description: `Top-up via ${topUpMethod === 'instapay' ? 'InstaPay' : 'Vodafone Cash'} (pending confirmation)`,
      });
      toast.success(t.driver.topUpPending);
      setShowTopUp(false);
    } catch {
      toast.error(t.common.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 safe-top">
      <div className="px-5 pt-6 pb-4">
        <h1 className="text-2xl font-bold">{t.nav.wallet}</h1>
      </div>

      {/* Balance Card */}
      {driverProfile && (
        <div className="mx-5 mb-6 bg-card rounded-2xl border border-border p-6 text-center">
          <Wallet className="w-8 h-8 mx-auto mb-2 text-accent" />
          <p className="text-3xl font-black">{driverProfile.balance} <span className="text-lg font-medium text-muted-foreground">{t.common.egp}</span></p>
          <p className="text-xs text-muted-foreground mt-1">{t.driver.commission}: {driverProfile.commission_per_delivery} {t.common.egp}</p>
          <Button onClick={() => setShowTopUp(!showTopUp)} className="mt-4 h-12 px-8 font-bold rounded-xl gap-2">
            <CreditCard className="w-4 h-4" />
            {t.driver.topUp}
          </Button>
        </div>
      )}

      {/* Top Up Form */}
      {showTopUp && (
        <div className="mx-5 mb-6 bg-card rounded-2xl border border-border p-5 space-y-4">
          <Input
            type="number"
            min="200"
            value={topUpAmount}
            onChange={(e) => setTopUpAmount(e.target.value)}
            placeholder={t.driver.topUpAmount}
            className="h-12 text-base"
          />
          <p className="text-xs text-muted-foreground">{t.driver.minTopUp}</p>

          <div className="space-y-2">
            <label className="text-sm font-medium">{t.driver.topUpMethod}</label>
            <div className="grid grid-cols-2 gap-3">
              {([
                { type: 'instapay' as const, label: t.driver.instapay },
                { type: 'vodafone_cash' as const, label: t.driver.vodafoneCash },
              ]).map(({ type, label }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setTopUpMethod(type)}
                  className={cn(
                    'p-3 rounded-xl border-2 transition-all text-sm font-medium',
                    topUpMethod === type
                      ? 'border-foreground bg-foreground text-background'
                      : 'border-border hover:border-muted-foreground'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <Button onClick={requestTopUp} disabled={loading} className="w-full h-12 font-bold rounded-xl">
            {loading ? t.common.loading : t.driver.requestTopUp}
          </Button>
        </div>
      )}

      {/* Transactions */}
      <div className="px-5">
        <h2 className="text-sm font-semibold text-muted-foreground mb-3">{t.driver.transactions}</h2>
        {transactions.length === 0 ? (
          <div className="text-center py-12">
            <Wallet className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">{t.driver.noTransactions}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.map((tx) => (
              <div key={tx.id} className="bg-card rounded-xl p-4 border border-border flex items-center gap-3">
                {tx.amount > 0 ? (
                  <ArrowUpCircle className="w-5 h-5 text-accent flex-shrink-0" />
                ) : (
                  <ArrowDownCircle className="w-5 h-5 text-destructive flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{tx.description || tx.type}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(tx.created_at).toLocaleDateString()} · {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <p className={cn('text-sm font-bold', tx.amount > 0 ? 'text-accent' : 'text-destructive')}>
                  {tx.amount > 0 ? '+' : ''}{tx.amount} {t.common.egp}
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
