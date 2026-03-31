import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { LanguageToggle } from '@/components/LanguageToggle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Loader2, ShieldCheck } from 'lucide-react';

export default function AdminLogin() {
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const isRTL = lang === 'ar';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      const userId = data.user?.id;
      if (!userId) throw new Error('Login failed');

      // Verify admin role
      const { data: isAdmin, error: roleError } = await supabase.rpc('has_role', {
        _user_id: userId,
        _role: 'admin',
      });

      if (roleError || !isAdmin) {
        await supabase.auth.signOut();
        throw new Error('Access denied. Admin privileges required.');
      }

      navigate('/admin', { replace: true });
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn('min-h-screen bg-background flex flex-col', isRTL && 'rtl')} dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between px-4 pt-4">
        <LanguageToggle />
        <div className="w-10" />
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-sm space-y-6"
        >
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <ShieldCheck className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Admin Panel</h2>
            <p className="text-sm text-muted-foreground">Sign in with your admin credentials</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
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
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign In'}
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
