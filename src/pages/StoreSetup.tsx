import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, ArrowRight, Loader2, Store } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function StoreSetup() {
  const { t, dir } = useLanguage();
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const [storeName, setStoreName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const BackArrow = dir === 'rtl' ? ArrowRight : ArrowLeft;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName.trim()) return;
    setLoading(true);
    try {
      const data = await signUp(email, password, storeName, phone, 'store');
      if (data.user && data.session) {
        localStorage.setItem('wasaly_onboarded', 'true');
        toast.success(t.common.success);
        navigate('/store', { replace: true });
      } else {
        toast.success(t.auth.checkEmail);
        navigate('/auth', { replace: true });
      }
    } catch (err: any) {
      toast.error(err.message || t.common.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background safe-top">
      <div className="px-5 pt-6 pb-3">
        <button onClick={() => navigate('/welcome')} className="p-1">
          <BackArrow className="w-5 h-5 text-foreground" />
        </button>
      </div>

      <div className="flex-1 flex flex-col justify-center px-6 pb-12">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
            <Store className="w-8 h-8 text-accent" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">
            {t.store.storeName}
          </h1>
        </motion.div>

        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onSubmit={handleSubmit}
          className="space-y-4 max-w-sm mx-auto w-full"
        >
          <Input
            placeholder={t.store.storeName}
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            required
            className="h-12 text-base"
            autoFocus
          />
          <Input
            placeholder={t.auth.phone}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            type="tel"
            className="h-12 text-base"
          />
          <Input
            placeholder={t.auth.email}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
            className="h-12 text-base"
          />
          <Input
            placeholder={t.auth.password}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
            minLength={6}
            className="h-12 text-base"
          />

          <Button
            type="submit"
            disabled={loading || !storeName.trim()}
            className="w-full h-14 text-base font-bold rounded-xl"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
            {loading ? t.common.loading : t.auth.signup}
          </Button>
        </motion.form>
      </div>
    </div>
  );
}
