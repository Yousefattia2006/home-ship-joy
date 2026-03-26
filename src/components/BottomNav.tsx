import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Package, Settings, Wallet, MessageCircle } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { cn } from '@/lib/utils';

interface NavItem {
  path: string;
  icon: React.ElementType;
  labelKey: 'home' | 'deliveries' | 'settings' | 'payments' | 'messages';
}

interface BottomNavProps {
  items: NavItem[];
}

export function BottomNav({ items }: BottomNavProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {items.map((item) => {
          const Icon = item.icon;
          const active = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors',
                active ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              <Icon className={cn('w-5 h-5', active && 'text-accent')} />
              <span className="text-[10px] font-medium">{t.nav[item.labelKey]}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export const storeNavItems: NavItem[] = [
  { path: '/store', icon: Home, labelKey: 'home' },
  { path: '/store/deliveries', icon: Package, labelKey: 'deliveries' },
  { path: '/messages', icon: MessageCircle, labelKey: 'messages' },
  { path: '/store/settings', icon: Settings, labelKey: 'settings' },
];

export const driverNavItems: NavItem[] = [
  { path: '/driver', icon: Home, labelKey: 'home' },
  { path: '/messages', icon: MessageCircle, labelKey: 'messages' },
  { path: '/driver/payments', icon: Wallet, labelKey: 'payments' },
  { path: '/driver/settings', icon: Settings, labelKey: 'settings' },
];
