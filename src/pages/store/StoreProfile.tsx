import { useState, useEffect } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { BottomNav, storeNavItems } from '@/components/BottomNav';
import { LanguageToggle } from '@/components/LanguageToggle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LogOut, Globe } from 'lucide-react';
import { toast } from 'sonner';

export default function StoreProfile() {
  const { t, lang, setLang } = useLanguage();
  const { user, signOut } = useAuth();
  const [storeName, setStoreName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from('store_profiles').select('*').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => {
        if (data) {
          setStoreName(data.store_name || '');
          setAddress(data.address || '');
          setPhone(data.phone || '');
        }
      });
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('store_profiles')
      .update({ store_name: storeName, address, phone })
      .eq('user_id', user.id);
    if (error) toast.error(t.common.error);
    else toast.success(t.common.success);
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-background pb-20 safe-top">
      <div className="px-5 pt-6 pb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t.common.profile}</h1>
        <LanguageToggle />
      </div>

      <div className="px-5 space-y-4">
        <Input placeholder={t.store.storeName} value={storeName} onChange={e => setStoreName(e.target.value)} className="h-12" />
        <Input placeholder={t.store.storeAddress} value={address} onChange={e => setAddress(e.target.value)} className="h-12" />
        <Input placeholder={t.auth.phone} value={phone} onChange={e => setPhone(e.target.value)} className="h-12" />
        <Button onClick={handleSave} disabled={saving} className="w-full h-12 font-bold rounded-xl">
          {saving ? t.common.loading : t.common.save}
        </Button>
        {/* Language Setting */}
        <div className="pt-4 border-t border-border">
          <h2 className="text-lg font-semibold mb-3">{t.common.settings}</h2>
          <div className="flex items-center justify-between bg-card rounded-xl p-4 border border-border mb-3">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">{t.settings?.language || 'Language'}</span>
            </div>
            <div className="flex gap-2">
              {(['en', 'ar'] as const).map(l => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                    lang === l ? 'bg-foreground text-background' : 'bg-secondary text-muted-foreground'
                  }`}
                >
                  {l === 'en' ? 'English' : 'عربي'}
                </button>
              ))}
            </div>
          </div>
          <Button variant="outline" onClick={signOut} className="w-full h-12 font-medium rounded-xl gap-2 text-destructive">
            <LogOut className="w-4 h-4" />
            {t.common.signOut}
          </Button>
        </div>
      </div>

      <BottomNav items={storeNavItems} />
    </div>
  );
}
