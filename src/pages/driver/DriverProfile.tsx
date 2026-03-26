import { useState, useEffect } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { BottomNav, driverNavItems } from '@/components/BottomNav';
import { LanguageToggle } from '@/components/LanguageToggle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LogOut, Bike, Globe } from 'lucide-react';
import { toast } from 'sonner';

export default function DriverProfile() {
  const { t, lang, setLang } = useLanguage();
  const { user, signOut } = useAuth();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from('driver_profiles').select('*').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => {
        if (data) {
          setProfile(data);
          setFullName(data.full_name || '');
          setPhone(data.phone || '');
          setPlateNumber(data.plate_number || '');
        }
      });
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('driver_profiles')
      .update({ full_name: fullName, phone, plate_number: plateNumber })
      .eq('user_id', user.id);
    if (error) toast.error(t.common.error);
    else toast.success(t.common.success);
    setSaving(false);
  };

  const docStatus = (url: string | null) => url ? '✅' : '⏳';

  return (
    <div className="min-h-screen bg-background pb-20 safe-top">
      <div className="px-5 pt-6 pb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t.common.profile}</h1>
        <LanguageToggle />
      </div>

      <div className="px-5 space-y-4">
        <Input placeholder={t.auth.fullName} value={fullName} onChange={e => setFullName(e.target.value)} className="h-12" />
        <Input placeholder={t.auth.phone} value={phone} onChange={e => setPhone(e.target.value)} className="h-12" />
        <Input placeholder={t.driver.plateNumber} value={plateNumber} onChange={e => setPlateNumber(e.target.value)} className="h-12" />

        <div className="flex items-center gap-2 p-3 rounded-xl border-2 border-foreground bg-foreground text-background text-sm font-medium">
          <Bike className="w-5 h-5" />
          {t.store.motorcycle}
        </div>

        {/* Document Status */}
        {profile && (
          <div className="bg-card rounded-xl p-4 border border-border space-y-2">
            <p className="text-sm font-semibold mb-2">{t.admin.viewDocs}</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1.5">
                <span>{docStatus(profile.national_id_url)}</span>
                <span>{t.driver.nationalId}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span>{docStatus(profile.national_id_back_url)}</span>
                <span>{t.driver.nationalIdBack}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span>{docStatus(profile.driving_license_front_url)}</span>
                <span>{t.driver.driverLicense}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span>{docStatus(profile.selfie_url)}</span>
                <span>{t.driver.selfie}</span>
              </div>
            </div>
          </div>
        )}

        <Button onClick={handleSave} disabled={saving} className="w-full h-12 font-bold rounded-xl">
          {saving ? t.common.loading : t.common.save}
        </Button>

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

      <BottomNav items={driverNavItems} />
    </div>
  );
}
