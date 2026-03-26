import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Clock, XCircle, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';

export default function DriverApprovalStatus() {
  const { t } = useLanguage();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<string>('pending');

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase.from('driver_profiles')
        .select('approval_status, onboarding_completed')
        .eq('user_id', user.id).maybeSingle();
      if (data) {
        if (!data.onboarding_completed) { navigate('/driver/onboarding', { replace: true }); return; }
        if (data.approval_status === 'approved') { navigate('/driver', { replace: true }); return; }
        setStatus(data.approval_status);
      }
    };
    fetch();
    // Poll for status changes
    const interval = setInterval(fetch, 10000);
    return () => clearInterval(interval);
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-background safe-top flex flex-col items-center justify-center px-6">
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center space-y-6 max-w-sm">
        {status === 'pending' && (
          <>
            <Clock className="w-20 h-20 text-warning mx-auto" />
            <h1 className="text-2xl font-bold">{t.driverOnboarding?.pendingReviewTitle || 'Application Under Review'}</h1>
            <p className="text-muted-foreground">{t.driverOnboarding?.pendingReviewDesc || 'Your information has been sent for review. Once approved, your account will be activated and you will be able to start delivering orders.'}</p>
          </>
        )}
        {status === 'rejected' && (
          <>
            <XCircle className="w-20 h-20 text-destructive mx-auto" />
            <h1 className="text-2xl font-bold">{t.driverOnboarding?.rejectedTitle || 'Application Not Approved'}</h1>
            <p className="text-muted-foreground">{t.driverOnboarding?.rejectedDesc || 'Unfortunately, your application was not approved at this time. Please contact support for more information.'}</p>
          </>
        )}
        <Button variant="outline" onClick={signOut} className="w-full h-12 gap-2">
          <LogOut className="w-4 h-4" />
          {t.common.logout}
        </Button>
      </motion.div>
    </div>
  );
}
