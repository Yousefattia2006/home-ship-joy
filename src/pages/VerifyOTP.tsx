import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { LanguageToggle } from '@/components/LanguageToggle';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Loader2, Mail, RotateCcw } from 'lucide-react';

export default function VerifyOTP() {
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const isRTL = lang === 'ar';

  const { email, password, userId, role } = (location.state as {
    email?: string;
    password?: string;
    userId?: string;
    role?: string;
  }) || {};

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval>>();
  const verifiedRef = useRef(false);

  useEffect(() => {
    if (!email || !userId) {
      navigate('/auth', { replace: true });
    }
  }, [email, userId, navigate]);

  // If user abandons verification (driver role), wipe the half-created account
  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
      if (!verifiedRef.current && userId && role === 'driver') {
        supabase.functions.invoke('delete-incomplete-driver', { body: { user_id: userId } }).catch(() => {});
      }
    };
  }, [userId, role]);

  const startCooldown = () => {
    setCooldown(30);
    cooldownRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleVerify = async () => {
    if (otp.length !== 6) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-otp', {
        body: { action: 'verify', user_id: userId, otp },
      });

      if (error || data?.error) {
        const errCode = data?.error || 'unknown';
        if (errCode === 'otp_expired') {
          toast.error(t.verify.otpExpired);
        } else if (errCode === 'invalid_otp') {
          toast.error(t.verify.invalidOtp);
        } else {
          toast.error(t.verify.verifyError);
        }
        setOtp('');
        return;
      }

      verifiedRef.current = true;
      toast.success(t.verify.success);

      // Re-sign in so the session is active for subsequent pages
      if (email && password) {
        await supabase.auth.signInWithPassword({ email, password });
      }

      // Navigate based on role
      if (role === 'store') {
        navigate('/store', { replace: true });
      } else if (role === 'driver') {
        navigate('/driver/onboarding', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } catch {
      toast.error(t.verify.verifyError);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setResending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-otp', {
        body: { action: 'send', user_id: userId, email },
      });

      if (error || data?.error) {
        toast.error(t.verify.resendError);
        return;
      }

      toast.success(t.verify.resent);
      startCooldown();
    } catch {
      toast.error(t.verify.resendError);
    } finally {
      setResending(false);
    }
  };

  if (!email || !userId) return null;

  return (
    <div className={cn('min-h-screen bg-background flex flex-col', isRTL && 'rtl')} dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between px-4 pt-4">
        <LanguageToggle />
        <h1 className="text-lg font-bold text-foreground font-['Inter']">Tawseel</h1>
        <div className="w-10" />
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-sm space-y-8 text-center"
        >
          <div className="mx-auto w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center">
            <Mail className="w-8 h-8 text-accent" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">{t.verify.title}</h2>
            <p className="text-sm text-muted-foreground">{t.verify.subtitle}</p>
            <p className="text-sm font-semibold text-foreground">{email}</p>
          </div>

          <div className="flex justify-center">
            <InputOTP maxLength={6} value={otp} onChange={setOtp}>
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>

          <Button
            onClick={handleVerify}
            disabled={loading || otp.length !== 6}
            className="w-full h-12 text-base font-bold rounded-xl"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : t.verify.verifyButton}
          </Button>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{t.verify.didntReceive}</p>
            <Button
              variant="ghost"
              onClick={handleResend}
              disabled={resending || cooldown > 0}
              className="text-accent font-semibold"
            >
              {resending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <RotateCcw className="w-4 h-4 mr-2" />
              )}
              {cooldown > 0
                ? `${t.verify.resendIn} ${cooldown}s`
                : t.verify.resendButton}
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
