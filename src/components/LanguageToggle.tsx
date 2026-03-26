import { useLanguage } from '@/i18n/LanguageContext';
import { cn } from '@/lib/utils';

export function LanguageToggle({ className }: { className?: string }) {
  const { lang, setLang } = useLanguage();

  return (
    <button
      onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
      className={cn(
        'px-3 py-1.5 rounded-full text-xs font-bold border border-border transition-colors',
        'hover:bg-secondary',
        className
      )}
    >
      {lang === 'en' ? 'عربي' : 'EN'}
    </button>
  );
}
