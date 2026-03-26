import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { BottomNav, storeNavItems } from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { Store, CreditCard, FileText, Mail, Globe, LogOut, ChevronLeft, ChevronRight } from 'lucide-react';

export default function StoreSettings() {
  const { t, lang, setLang, dir } = useLanguage();
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const ChevronIcon = dir === 'rtl' ? ChevronLeft : ChevronRight;

  const items = [
    { icon: Store, label: t.settings.storeInfo, path: '/store/settings/info' },
    { icon: CreditCard, label: t.settings.paymentInfo, path: '/store/settings/payment' },
    { icon: FileText, label: t.settings.termsAndConditions, path: '/store/settings/terms' },
    { icon: Mail, label: t.settings.contactUs, path: '/store/settings/contact' },
  ];

  return (
    <div className="min-h-screen bg-background pb-20 safe-top">
      <div className="px-5 pt-6 pb-4">
        <h1 className="text-2xl font-bold">{t.common.settings}</h1>
      </div>

      <div className="px-5 space-y-2">
        {items.map(({ icon: Icon, label, path }) => (
          <button
            key={path}
            onClick={() => navigate(path)}
            className="w-full flex items-center gap-3 bg-card rounded-xl p-4 border border-border active:bg-secondary transition-colors"
          >
            <Icon className="w-5 h-5 text-muted-foreground" />
            <span className="flex-1 text-sm font-medium text-start">{label}</span>
            <ChevronIcon className="w-4 h-4 text-muted-foreground" />
          </button>
        ))}

        {/* Language toggle */}
        <div className="flex items-center gap-3 bg-card rounded-xl p-4 border border-border">
          <Globe className="w-5 h-5 text-muted-foreground" />
          <span className="flex-1 text-sm font-medium">{t.settings.language}</span>
          <div className="flex gap-2">
            {(['ar', 'en'] as const).map(l => (
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

        <div className="pt-4">
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
