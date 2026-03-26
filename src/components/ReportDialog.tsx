import { useState } from 'react';
import { Flag } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ReportDialogProps {
  deliveryId: string;
  role: 'store' | 'driver';
  children: React.ReactNode;
}

export function ReportDialog({ deliveryId, role, children }: ReportDialogProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState('');
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);

  const reasons = [
    t.report?.driverNoShow || 'Driver did not arrive',
    t.report?.storeNoHandover || 'Store did not hand over order',
    t.report?.wrongLocation || 'Wrong location',
    t.report?.harassment || 'Harassment / unsafe behavior',
    t.report?.orderIssue || 'Order issue',
    t.report?.fraud || 'Fraud concern',
    t.report?.other || 'Other',
  ];

  const handleSubmit = async () => {
    if (!user || !selectedReason) return;
    setLoading(true);
    try {
      await supabase.from('reports').insert({
        delivery_id: deliveryId,
        reporter_user_id: user.id,
        reporter_role: role,
        reason: selectedReason,
        details: details || null,
      });
      toast.success(t.report?.submitted || 'Report submitted');
      setOpen(false);
      setSelectedReason('');
      setDetails('');
    } catch (err: any) {
      toast.error(t.common.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="w-5 h-5 text-warning" />
            {t.report?.title || 'Report Issue'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          {reasons.map(r => (
            <button
              key={r}
              onClick={() => setSelectedReason(r)}
              className={cn(
                'w-full text-left px-4 py-3 rounded-xl border-2 text-sm transition-all',
                selectedReason === r
                  ? 'border-foreground bg-foreground text-background'
                  : 'border-border hover:border-muted-foreground'
              )}
            >
              {r}
            </button>
          ))}
        </div>
        <Textarea
          placeholder={t.report?.detailsPlaceholder || 'Provide more details...'}
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          className="min-h-[60px]"
        />
        <Button onClick={handleSubmit} disabled={!selectedReason || loading} className="w-full">
          {loading ? t.common.loading : (t.report?.submit || 'Submit Report')}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
