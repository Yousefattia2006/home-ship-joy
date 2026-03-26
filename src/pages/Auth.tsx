import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/i18n/LanguageContext';
import { LanguageToggle } from '@/components/LanguageToggle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Loader2, Store, Bike } from 'lucide-react';

type Mode = 'login' | 'signup';

export default function Auth() {
  const { t, lang, dir } = useLanguage();
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const isRTL = lang === 'ar';

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedRole, setSelectedRole] = useState<'store' | 'driver'>('store');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'login') {
        await signIn(email, password);
        navigate('/', { replace: true });
      } else {
        await signUp(email, password, fullName, phone, selectedRole);
        toast.success(t.auth.checkEmail);
      }
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn('min-h-screen bg-background flex flex-col', isRTL && 'rtl')} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
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
          className="w-full max-w-sm space-y-6"
        >
          {/* Title */}
          <div className="text-center space-y-1">
            <h2 className="text-2xl font-bold text-foreground">
              {mode === 'login' ? t.auth.login : t.auth.signup}
            </h2>
          </div>

          {/* Mode tabs */}
          <div className="flex rounded-xl bg-secondary p-1 gap-1">
            {(['login', 'signup'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={cn(
                  'flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all',
                  mode === m
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {m === 'login' ? t.auth.login : t.auth.signup}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {mode === 'signup' && (
                <motion.div
                  key="signup-fields"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4 overflow-hidden"
                >
                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="text-sm font-medium">{t.auth.fullName}</Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      className="h-12 rounded-xl bg-secondary border-0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm font-medium">{t.auth.phone}</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      className="h-12 rounded-xl bg-secondary border-0"
                    />
                  </div>
                  {/* Role selector */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">{t.auth.selectRole}</Label>
                    <div className="flex gap-3">
                      {([
                        { value: 'store' as const, label: t.auth.store, icon: Store },
                        { value: 'driver' as const, label: t.auth.driver, icon: Bike },
                      ]).map(({ value, label, icon: Icon }) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setSelectedRole(value)}
                          className={cn(
                            'flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all',
                            selectedRole === value
                              ? 'border-accent bg-accent/10 text-accent'
                              : 'border-border bg-secondary text-muted-foreground hover:border-accent/50'
                          )}
                        >
                          <Icon className="w-6 h-6" />
                          <span className="text-xs font-semibold">{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">{t.auth.email}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 rounded-xl bg-secondary border-0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">{t.auth.password}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="h-12 rounded-xl bg-secondary border-0"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 text-base font-bold rounded-xl"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (mode === 'login' ? t.auth.login : t.auth.signup)}
            </Button>
          </form>

          {/* Toggle mode */}
          <p className="text-center text-sm text-muted-foreground">
            {mode === 'login' ? t.auth.noAccount : t.auth.hasAccount}{' '}
            <button
              onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
              className="text-accent font-semibold"
            >
              {mode === 'login' ? t.auth.signup : t.auth.login}
            </button>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
