import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function StoreSettingsInfo() {
  const { t, dir } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [storeName, setStoreName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  const BackIcon = dir === 'rtl' ? ArrowRight : ArrowLeft;

  useEffect(() => {
    if (!user) return;
    supabase.from('store_profiles').select('*').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => {
        if (data) {
          setStoreName(data.store_name || '');
          setAddress(data.address || '');
          setPhone(data.phone || '');
        }
      });
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('store_profiles')
      .update({ store_name: storeName, address, phone })
      .eq('user_id', user.id);
    if (error) toast.error(t.common.error);
    else toast.success(t.common.success);
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-background safe-top">
      <div className="px-5 pt-6 pb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 -ms-2 rounded-full hover:bg-secondary">
          <BackIcon className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold">{t.settings.storeInfo}</h1>
      </div>

      <div className="px-5 space-y-4">
        <Input placeholder={t.store.storeName} value={storeName} onChange={e => setStoreName(e.target.value)} className="h-12" />
        <Input placeholder={t.store.storeAddress} value={address} onChange={e => setAddress(e.target.value)} className="h-12" />
        <Input placeholder={t.auth.phone} value={phone} onChange={e => setPhone(e.target.value)} className="h-12" />
        <Button onClick={handleSave} disabled={saving} className="w-full h-12 font-bold rounded-xl">
          {saving ? t.common.loading : t.common.save}
        </Button>
      </div>
    </div>
  );
}
