import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { LanguageToggle } from '@/components/LanguageToggle';
import { Bike, Store } from 'lucide-react';
import { motion } from 'framer-motion';

export default function RoleSelection() {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const roles = [
    {
      key: 'driver',
      icon: Bike,
      emoji: '🚗',
      label: t.auth.driver,
      description: t.app.tagline,
      path: '/welcome/driver',
    },
    {
      key: 'store',
      icon: Store,
      emoji: '🏪',
      label: t.auth.store,
      description: t.store.createDelivery,
      path: '/welcome/store',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background safe-top">
      <div className="flex items-center justify-between px-6 pt-6">
        <div />
        <LanguageToggle />
      </div>

      <div className="flex-1 flex flex-col justify-center px-6 pb-12">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <h1 className="text-3xl font-black tracking-tight text-foreground mb-2">
            Tawseel — توصيل
          </h1>
          <p className="text-lg text-muted-foreground">{t.auth.selectRole}</p>
        </motion.div>

        <div className="space-y-4 max-w-sm mx-auto w-full">
          {roles.map((role, i) => (
            <motion.button
              key={role.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.1 }}
              onClick={() => navigate(role.path)}
              className="w-full flex items-center gap-4 p-5 rounded-2xl border-2 border-border bg-card hover:border-accent hover:bg-accent/5 transition-all active:scale-[0.98]"
            >
              <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center shrink-0 text-2xl">
                {role.emoji}
              </div>
              <div className="text-start">
                <p className="text-lg font-bold text-foreground">{role.label}</p>
                <p className="text-sm text-muted-foreground">{role.description}</p>
              </div>
            </motion.button>
          ))}
        </div>

      </div>
    </div>
  );
}
