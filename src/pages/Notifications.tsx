import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, CheckCheck } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  delivery_id: string | null;
  is_read: boolean;
  created_at: string;
}

export default function Notifications() {
  const { t, lang } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const isRTL = lang === 'ar';

  useEffect(() => {
    if (!user) return;

    const fetchNotifications = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);
      if (data) setNotifications(data as Notification[]);
      setLoading(false);
    };

    fetchNotifications();

    const channel = supabase
      .channel('notifications-page')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        setNotifications(prev => [payload.new as Notification, ...prev]);
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        setNotifications(prev =>
          prev.map(n => n.id === (payload.new as Notification).id ? payload.new as Notification : n)
        );
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markAsRead = async (id: string) => {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const markAllRead = async () => {
    if (!user) return;
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const timeAgo = (date: string) => {
    const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
    if (mins < 1) return t.notifications?.justNow || 'Just now';
    if (mins < 60) return `${mins}m`;
    if (mins < 1440) return `${Math.floor(mins / 60)}h`;
    return `${Math.floor(mins / 1440)}d`;
  };

  const typeIcon = (type: string) => {
    switch (type) {
      case 'new_order': return '📦';
      case 'driver_accepted': return '✅';
      case 'arriving_pickup': return '🚗';
      case 'near_customer': return '📍';
      case 'cancelled': return '❌';
      case 'delivered': return '🎉';
      default: return '🔔';
    }
  };

  return (
    <div className={cn('min-h-screen bg-background', isRTL && 'rtl')}>
      {/* Header */}
      <div className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-1.5 rounded-full hover:bg-secondary">
              <ArrowLeft className={cn('w-5 h-5', isRTL && 'rotate-180')} />
            </button>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold">{t.notifications?.title || 'Notifications'}</h1>
              {unreadCount > 0 && (
                <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                  {unreadCount}
                </Badge>
              )}
            </div>
          </div>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllRead} className="text-xs text-accent gap-1">
              <CheckCheck className="w-4 h-4" />
              {t.notifications?.markAllRead || 'Mark all read'}
            </Button>
          )}
        </div>
      </div>

      {/* List */}
      <ScrollArea className="h-[calc(100vh-56px-64px)]">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-sm text-muted-foreground">{t.common?.loading || 'Loading...'}</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Bell className="w-12 h-12 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">{t.notifications?.empty || 'No notifications yet'}</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {notifications.map(n => (
              <div
                key={n.id}
                className={cn(
                  'flex items-start gap-3 px-4 py-3.5 transition-colors',
                  !n.is_read && 'bg-accent/5'
                )}
              >
                <span className="text-xl mt-0.5 shrink-0">{typeIcon(n.type)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={cn('text-sm', !n.is_read && 'font-semibold')}>{n.title}</p>
                    <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">{timeAgo(n.created_at)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                </div>
                {!n.is_read && (
                  <button
                    onClick={() => markAsRead(n.id)}
                    className="shrink-0 mt-1 text-[10px] text-accent font-medium hover:underline"
                  >
                    {t.notifications?.markRead || 'Read'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
