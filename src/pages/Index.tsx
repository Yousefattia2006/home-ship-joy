import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import SplashScreen from './SplashScreen';

const Index = () => {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  const [showSplash, setShowSplash] = useState(true);
  const [splashDone, setSplashDone] = useState(false);

  const handleSplashComplete = useCallback(() => {
    setSplashDone(true);
    setShowSplash(false);
  }, []);

  useEffect(() => {
    if (!splashDone || loading) return;

    // No active session → go straight to unified auth (signup/login)
    if (!user) {
      navigate('/auth', { replace: true });
      return;
    }

    // Authenticated — route by role
    const routeDriver = async () => {
      const { data: profile } = await supabase.from('driver_profiles')
        .select('onboarding_completed, approval_status')
        .eq('user_id', user.id).maybeSingle();

      if (!profile || !profile.onboarding_completed) {
        navigate('/driver/onboarding', { replace: true });
        return;
      }
      if (profile.approval_status === 'pending' || profile.approval_status === 'rejected') {
        navigate('/driver/status', { replace: true });
        return;
      }
      if (profile.approval_status === 'approved') {
        const { data: payout } = await supabase.from('driver_payout_methods')
          .select('id').eq('driver_user_id', user.id).maybeSingle();
        if (!payout) {
          navigate('/driver/congrats', { replace: true });
          return;
        }
      }
      navigate('/driver', { replace: true });
    };

    console.log('[Index] Routing for role:', role);
    switch (role) {
      case 'store': navigate('/store', { replace: true }); break;
      case 'driver': routeDriver(); break;
      case 'admin': navigate('/admin', { replace: true }); break;
      default: navigate('/auth', { replace: true });
    }
  }, [user, role, loading, navigate, splashDone]);

  if (showSplash) {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-pulse w-4 h-4 rounded-full bg-accent" />
    </div>
  );
};

export default Index;
