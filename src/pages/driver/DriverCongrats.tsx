import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function DriverCongrats() {
  const { t } = useLanguage();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background safe-top flex flex-col items-center justify-center px-6">
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center space-y-6 max-w-sm">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring' }}>
          <CheckCircle className="w-24 h-24 text-accent mx-auto" />
        </motion.div>
        <h1 className="text-3xl font-black">{t.driverOnboarding?.congratsTitle || 'Congratulations!'}</h1>
        <p className="text-muted-foreground text-lg">{t.driverOnboarding?.congratsDesc || 'Your account has been approved. You can now go online and start delivering orders.'}</p>
        <Button onClick={() => navigate('/driver/payout', { replace: true })} className="w-full h-14 text-base font-bold rounded-xl">
          {t.driverOnboarding?.setupPayout || 'Set Up Payment Method'}
        </Button>
      </motion.div>
    </div>
  );
}
