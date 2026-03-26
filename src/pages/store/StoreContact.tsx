import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Mail, Phone, MessageCircle } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';

export default function StoreContact() {
  const { t, dir } = useLanguage();
  const navigate = useNavigate();
  const BackIcon = dir === 'rtl' ? ArrowRight : ArrowLeft;

  return (
    <div className="min-h-screen bg-background safe-top">
      <div className="px-5 pt-6 pb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 -ms-2 rounded-full hover:bg-secondary">
          <BackIcon className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold">{t.contact.title}</h1>
      </div>
      <div className="px-5 space-y-3">
        <p className="text-sm text-muted-foreground mb-4">{t.contact.description}</p>
        <div className="flex items-center gap-3 bg-card rounded-xl p-4 border border-border">
          <Mail className="w-5 h-5 text-muted-foreground" />
          <span className="text-sm">{t.contact.email}</span>
        </div>
        <div className="flex items-center gap-3 bg-card rounded-xl p-4 border border-border">
          <Phone className="w-5 h-5 text-muted-foreground" />
          <span className="text-sm">{t.contact.phone}</span>
        </div>
        <div className="flex items-center gap-3 bg-card rounded-xl p-4 border border-border">
          <MessageCircle className="w-5 h-5 text-muted-foreground" />
          <span className="text-sm">{t.contact.whatsapp}</span>
        </div>
      </div>
    </div>
  );
}
