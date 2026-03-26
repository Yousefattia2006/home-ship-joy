import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CreditCard } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';

export default function StoreSettingsPayment() {
  const { t, dir } = useLanguage();
  const navigate = useNavigate();
  const BackIcon = dir === 'rtl' ? ArrowRight : ArrowLeft;

  return (
    <div className="min-h-screen bg-background safe-top">
      <div className="px-5 pt-6 pb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 -ms-2 rounded-full hover:bg-secondary">
          <BackIcon className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold">{t.settings.paymentInfo}</h1>
      </div>
      <div className="px-5 py-12 text-center">
        <CreditCard className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">{t.settings.paymentInfo}</p>
      </div>
    </div>
  );
}
