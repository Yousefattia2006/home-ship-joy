import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Bike } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export default function DriverSettingsInfo() {
  const { t, dir } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);

  const BackIcon = dir === 'rtl' ? ArrowRight : ArrowLeft;

  useEffect(() => {
    if (!user) return;
    supabase.from('driver_profiles').select('*').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => { if (data) setProfile(data); });
  }, [user]);

  if (!profile) return <div className="min-h-screen flex items-center justify-center">{t.common.loading}</div>;

  const fields = [
    { label: t.auth.fullName, value: profile.full_name },
    { label: t.auth.phone, value: profile.phone },
    { label: t.driver.plateNumber, value: profile.plate_number },
    { label: t.driverOnboarding.governorate, value: profile.governorate },
    { label: t.driverOnboarding.nationalIdNumber, value: profile.national_id_number },
    { label: t.driverOnboarding.dateOfBirth, value: profile.date_of_birth },
  ];

  return (
    <div className="min-h-screen bg-background safe-top">
      <div className="px-5 pt-6 pb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 -ms-2 rounded-full hover:bg-secondary">
          <BackIcon className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold">{t.settings.personalInfo}</h1>
      </div>

      <div className="px-5 space-y-3">
        {fields.map(({ label, value }) => (
          <div key={label} className="bg-card rounded-xl p-4 border border-border">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
            <p className="text-sm font-medium">{value || '—'}</p>
          </div>
        ))}
        <div className="flex items-center gap-2 p-3 rounded-xl border-2 border-foreground bg-foreground text-background text-sm font-medium">
          <Bike className="w-5 h-5" />
          {t.store.motorcycle}
        </div>

        {/* Document Status */}
        <div className="bg-card rounded-xl p-4 border border-border space-y-2">
          <p className="text-sm font-semibold mb-2">{t.admin.viewDocs}</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {[
              { url: profile.national_id_url, label: t.driver.nationalId },
              { url: profile.national_id_back_url, label: t.driver.nationalIdBack },
              { url: profile.driving_license_front_url, label: t.driver.driverLicense },
              { url: profile.selfie_url, label: t.driver.selfie },
            ].map(({ url, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <span>{url ? '✅' : '⏳'}</span>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
