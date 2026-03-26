import { cn } from '@/lib/utils';
import { useLanguage } from '@/i18n/LanguageContext';

type DeliveryStatus = 'pending' | 'finding_driver' | 'driver_accepted' | 'arriving_pickup' | 'picked_up' | 'en_route' | 'delivered' | 'cancelled';

const statusConfig: Record<DeliveryStatus, { colorClass: string; key: string }> = {
  pending: { colorClass: 'bg-muted text-muted-foreground', key: 'pending' },
  finding_driver: { colorClass: 'bg-warning/20 text-warning', key: 'finding' },
  driver_accepted: { colorClass: 'bg-accent/20 text-accent', key: 'accepted' },
  arriving_pickup: { colorClass: 'bg-accent/20 text-accent', key: 'arrivingPickup' },
  picked_up: { colorClass: 'bg-accent/20 text-accent', key: 'pickedUp' },
  en_route: { colorClass: 'bg-primary/10 text-primary', key: 'enRoute' },
  delivered: { colorClass: 'bg-success/20 text-success', key: 'delivered' },
  cancelled: { colorClass: 'bg-destructive/20 text-destructive', key: 'cancelled' },
};

export function StatusBadge({ status }: { status: DeliveryStatus }) {
  const { t } = useLanguage();
  const config = statusConfig[status] || statusConfig.pending;
  const label = (t.delivery as any)[config.key] || status;

  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold', config.colorClass)}>
      {status === 'finding_driver' && <span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse-dot mr-1.5" />}
      {label}
    </span>
  );
}
