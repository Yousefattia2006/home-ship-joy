import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EGYPT_BANKS } from '@/lib/egyptBanks';
import { Wallet, CreditCard, Building2, Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type PayoutMethod = 'instapay' | 'ewallet' | 'bank';

export default function DriverPayoutSetup() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [method, setMethod] = useState<PayoutMethod | null>(null);
  const [instapayNumber, setInstapayNumber] = useState('');
  const [ewalletNumber, setEwalletNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [bankReceiver, setBankReceiver] = useState('');
  const [bankSearch, setBankSearch] = useState('');
  const [showBankDropdown, setShowBankDropdown] = useState(false);
  const [saving, setSaving] = useState(false);

  const filteredBanks = useMemo(() => {
    if (!bankSearch) return EGYPT_BANKS;
    return EGYPT_BANKS.filter(b => b.toLowerCase().includes(bankSearch.toLowerCase()));
  }, [bankSearch]);

  // Check if payout already exists
  useEffect(() => {
    if (!user) return;
    supabase.from('driver_payout_methods').select('*').eq('driver_user_id', user.id).maybeSingle()
      .then(({ data }) => {
        if (data) navigate('/driver', { replace: true });
      });
  }, [user, navigate]);

  const canSubmit = (): boolean => {
    if (!method) return false;
    if (method === 'instapay') return !!instapayNumber;
    if (method === 'ewallet') return !!ewalletNumber;
    if (method === 'bank') return !!(bankName && bankAccount && bankReceiver);
    return false;
  };

  const handleSubmit = async () => {
    if (!user || !method) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('driver_payout_methods').insert({
        driver_user_id: user.id,
        method,
        instapay_number: method === 'instapay' ? instapayNumber : null,
        ewallet_number: method === 'ewallet' ? ewalletNumber : null,
        bank_name: method === 'bank' ? bankName : null,
        bank_account_number: method === 'bank' ? bankAccount : null,
        bank_receiver_name: method === 'bank' ? bankReceiver : null,
      });
      if (error) throw error;
      toast.success(t.common.success);
      navigate('/driver', { replace: true });
    } catch (err: any) {
      toast.error(err.message || t.common.error);
    } finally {
      setSaving(false);
    }
  };

  const methods: { key: PayoutMethod; icon: React.ElementType; label: string }[] = [
    { key: 'instapay', icon: Wallet, label: 'InstaPay' },
    { key: 'ewallet', icon: CreditCard, label: 'E-Wallet' },
    { key: 'bank', icon: Building2, label: t.driverOnboarding?.bankAccount || 'Bank Account' },
  ];

  return (
    <div className="min-h-screen bg-background safe-top flex flex-col px-5 pt-6 pb-8">
      <h1 className="text-2xl font-bold mb-2">{t.driverOnboarding?.payoutTitle || 'Payment Method'}</h1>
      <p className="text-sm text-muted-foreground mb-6">{t.driverOnboarding?.payoutDesc || 'How would you like to receive your payments?'}</p>

      <div className="space-y-3 mb-6">
        {methods.map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => setMethod(key)}
            className={cn(
              'w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left',
              method === key ? 'border-foreground bg-foreground/5' : 'border-border hover:border-muted-foreground'
            )}
          >
            <Icon className="w-6 h-6 flex-shrink-0" />
            <span className="font-medium">{label}</span>
          </button>
        ))}
      </div>

      {method === 'instapay' && (
        <div className="space-y-3">
          <Input placeholder={t.driverOnboarding?.instapayNumber || 'InstaPay number'} value={instapayNumber} onChange={e => setInstapayNumber(e.target.value)} className="h-12" />
        </div>
      )}

      {method === 'ewallet' && (
        <div className="space-y-3">
          <Input placeholder={t.driverOnboarding?.ewalletNumber || 'E-Wallet number'} value={ewalletNumber} onChange={e => setEwalletNumber(e.target.value)} className="h-12" />
        </div>
      )}

      {method === 'bank' && (
        <div className="space-y-3">
          {/* Bank name searchable dropdown */}
          <div className="relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t.driverOnboarding?.searchBank || 'Search bank name...'}
                value={bankSearch}
                onChange={e => { setBankSearch(e.target.value); setShowBankDropdown(true); }}
                onFocus={() => setShowBankDropdown(true)}
                className="h-12 pl-10"
              />
            </div>
            {showBankDropdown && (
              <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-xl shadow-lg max-h-48 overflow-y-auto">
                {filteredBanks.map(bank => (
                  <button
                    key={bank}
                    onClick={() => { setBankName(bank); setBankSearch(bank); setShowBankDropdown(false); }}
                    className={cn(
                      'w-full text-left px-4 py-2.5 text-sm hover:bg-accent/10 transition-colors',
                      bankName === bank && 'bg-accent/10 font-medium'
                    )}
                  >
                    {bank}
                  </button>
                ))}
                {filteredBanks.length === 0 && (
                  <p className="px-4 py-3 text-sm text-muted-foreground">{t.addressPicker?.noResults || 'No results'}</p>
                )}
              </div>
            )}
          </div>
          {bankName && <p className="text-xs text-accent font-medium">{bankName}</p>}
          <Input placeholder={t.driverOnboarding?.accountNumber || 'Account number'} value={bankAccount} onChange={e => setBankAccount(e.target.value)} className="h-12" />
          <Input placeholder={t.driverOnboarding?.receiverName || 'Receiver name'} value={bankReceiver} onChange={e => setBankReceiver(e.target.value)} className="h-12" />
        </div>
      )}

      <div className="mt-auto pt-6">
        <Button onClick={handleSubmit} disabled={!canSubmit() || saving} className="w-full h-14 text-base font-bold rounded-xl gap-2">
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
          {saving ? t.common.loading : (t.driverOnboarding?.savePayout || 'Save Payment Method')}
        </Button>
      </div>
    </div>
  );
}
