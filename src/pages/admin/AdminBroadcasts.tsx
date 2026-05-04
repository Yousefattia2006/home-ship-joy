import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { getOneSignalDebugInfo, type OneSignalDebugInfo } from '@/lib/onesignal';
import { Send, Clock, Trash2, Loader2, Megaphone, Smartphone, RefreshCcw } from 'lucide-react';

type Audience = 'all' | 'drivers' | 'stores' | 'user';

interface Broadcast {
  id: string;
  title: string;
  body: string;
  audience: string;
  target_user_id: string | null;
  send_at: string | null;
  status: string;
  recipients_count: number;
  error: string | null;
  created_at: string;
  sent_at: string | null;
}

export default function AdminBroadcasts() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<Audience>('all');
  const [targetEmail, setTargetEmail] = useState('');
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleAt, setScheduleAt] = useState(''); // datetime-local value
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [pushDebug, setPushDebug] = useState<OneSignalDebugInfo | null>(null);
  const [checkingPush, setCheckingPush] = useState(false);

  const fetchHistory = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from('admin_broadcasts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    setHistory((data ?? []) as Broadcast[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const refreshPushDebug = async () => {
    setCheckingPush(true);
    try {
      const info = await getOneSignalDebugInfo();
      setPushDebug(info);
      const ready = info.available && info.permission === true && info.optedIn === true && !!info.subscriptionId && info.externalId === info.supabaseUserId;
      if (ready) toast.success('This device is subscribed for push');
      else toast.error('Push subscription is not ready on this device');
    } catch (e: any) {
      toast.error(e?.message || 'Could not check push status');
    } finally {
      setCheckingPush(false);
    }
  };

  const reset = () => {
    setTitle('');
    setBody('');
    setAudience('all');
    setTargetEmail('');
    setScheduleEnabled(false);
    setScheduleAt('');
  };

  const submit = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error('Title and message are required');
      return;
    }

    if (audience === 'user' && !targetEmail.trim()) {
      toast.error('Enter the recipient email');
      return;
    }

    if (scheduleEnabled && !scheduleAt) {
      toast.error('Pick a date & time to schedule');
      return;
    }

    setSubmitting(true);
    try {
      // Resolve target user id by email if needed
      let targetUserId: string | null = null;
      if (audience === 'user') {
        // Look up by store_profiles or driver_profiles (we don't expose auth.users)
        const { data: storeRow } = await supabase
          .from('store_profiles')
          .select('user_id, store_name')
          .ilike('store_name', `%${targetEmail.trim()}%`)
          .maybeSingle();
        if (storeRow?.user_id) targetUserId = storeRow.user_id;

        if (!targetUserId) {
          // Try driver phone/name
          const { data: drvRow } = await supabase
            .from('driver_profiles')
            .select('user_id, full_name, phone')
            .or(`phone.eq.${targetEmail.trim()},full_name.ilike.%${targetEmail.trim()}%`)
            .maybeSingle();
          if (drvRow?.user_id) targetUserId = drvRow.user_id;
        }

        if (!targetUserId) {
          toast.error('No matching user found by that email/phone/name');
          setSubmitting(false);
          return;
        }
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Not signed in');
        setSubmitting(false);
        return;
      }

      const sendAtIso = scheduleEnabled
        ? new Date(scheduleAt).toISOString()
        : null;

      const { data: inserted, error } = await (supabase as any)
        .from('admin_broadcasts')
        .insert({
          created_by: user.id,
          title: title.trim(),
          body: body.trim(),
          audience,
          target_user_id: targetUserId,
          send_at: sendAtIso,
        })
        .select()
        .single();

      if (error) throw error;

      // If "send now", trigger the dispatcher immediately
      if (!scheduleEnabled) {
        const { error: fnErr } = await supabase.functions.invoke(
          'dispatch-broadcasts',
          { body: { broadcast_id: inserted.id } },
        );
        if (fnErr) {
          toast.error(`Created, but dispatch failed: ${fnErr.message}`);
        } else {
          toast.success('Broadcast sent');
        }
      } else {
        toast.success(
          `Scheduled for ${new Date(sendAtIso!).toLocaleString()}`,
        );
      }

      reset();
      fetchHistory();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to create broadcast');
    } finally {
      setSubmitting(false);
    }
  };

  const cancelPending = async (id: string) => {
    const { error } = await (supabase as any)
      .from('admin_broadcasts')
      .delete()
      .eq('id', id);
    if (error) toast.error(error.message);
    else {
      toast.success('Removed');
      fetchHistory();
    }
  };

  const audienceLabel = (a: string, targetId: string | null) => {
    if (a === 'all') return 'All users';
    if (a === 'drivers') return 'All drivers';
    if (a === 'stores') return 'All stores';
    if (a === 'user') return `Single user${targetId ? '' : ''}`;
    return a;
  };

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      pending: 'bg-warning/20 text-warning',
      sent: 'bg-accent/20 text-accent',
      failed: 'bg-destructive/20 text-destructive',
    };
    return map[s] || 'bg-muted text-muted-foreground';
  };

  const pushReady = !!pushDebug?.available
    && pushDebug.permission === true
    && pushDebug.optedIn === true
    && !!pushDebug.subscriptionId
    && pushDebug.externalId === pushDebug.supabaseUserId;

  const shortValue = (value: unknown) => {
    if (value === null || value === undefined || value === '') return '—';
    const text = String(value);
    return text.length > 24 ? `${text.slice(0, 10)}…${text.slice(-8)}` : text;
  };

  return (
    <div className="space-y-5">
      {/* Composer */}
      <div className="bg-card rounded-xl p-4 border border-border space-y-4">
        <div className="flex items-center gap-2">
          <Megaphone className="w-4 h-4 text-accent" />
          <p className="text-sm font-semibold">New broadcast</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="bc-title" className="text-xs">Title</Label>
          <Input
            id="bc-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            placeholder="e.g. Service update"
            className="h-11 rounded-lg bg-secondary border-0 text-base"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bc-body" className="text-xs">Message</Label>
          <Textarea
            id="bc-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="Write the notification body…"
            className="rounded-lg bg-secondary border-0 text-base resize-none"
          />
          <p className="text-[10px] text-muted-foreground text-right">
            {body.length}/500
          </p>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Audience</Label>
          <Select value={audience} onValueChange={(v) => setAudience(v as Audience)}>
            <SelectTrigger className="h-11 rounded-lg bg-secondary border-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All users</SelectItem>
              <SelectItem value="drivers">All drivers</SelectItem>
              <SelectItem value="stores">All stores</SelectItem>
              <SelectItem value="user">Specific user</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {audience === 'user' && (
          <div className="space-y-2">
            <Label htmlFor="bc-target" className="text-xs">
              Recipient (store name, driver name, or driver phone)
            </Label>
            <Input
              id="bc-target"
              value={targetEmail}
              onChange={(e) => setTargetEmail(e.target.value)}
              placeholder="e.g. 01001234567 or Acme Bakery"
              className="h-11 rounded-lg bg-secondary border-0 text-base"
            />
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Schedule for later</Label>
            <button
              type="button"
              onClick={() => setScheduleEnabled((v) => !v)}
              className={cn(
                'h-6 w-11 rounded-full relative transition-colors',
                scheduleEnabled ? 'bg-primary' : 'bg-muted',
              )}
            >
              <span
                className={cn(
                  'absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-background transition-transform',
                  scheduleEnabled && 'translate-x-5',
                )}
              />
            </button>
          </div>
          {scheduleEnabled && (
            <Input
              type="datetime-local"
              value={scheduleAt}
              onChange={(e) => setScheduleAt(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              className="h-11 rounded-lg bg-secondary border-0 text-base"
            />
          )}
        </div>

        <Button
          onClick={submit}
          disabled={submitting}
          className="w-full h-11 rounded-lg gap-2"
        >
          {submitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : scheduleEnabled ? (
            <>
              <Clock className="w-4 h-4" />
              Schedule
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Send now
            </>
          )}
        </Button>
      </div>

      {/* History */}
      <div className="space-y-2">
        <p className="text-sm font-semibold px-1">Recent broadcasts</p>
        {loading && (
          <div className="flex justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        )}
        {!loading && history.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-6">
            No broadcasts yet.
          </p>
        )}
        {history.map((b) => (
          <div
            key={b.id}
            className="bg-card rounded-xl p-3 border border-border space-y-2"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{b.title}</p>
                <p className="text-xs text-muted-foreground line-clamp-2">{b.body}</p>
              </div>
              <span
                className={cn(
                  'text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap',
                  statusBadge(b.status),
                )}
              >
                {b.status}
              </span>
            </div>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>
                {audienceLabel(b.audience, b.target_user_id)}
                {b.status === 'sent' && ` · ${b.recipients_count} sent`}
              </span>
              <span>
                {b.send_at && b.status === 'pending'
                  ? `⏰ ${new Date(b.send_at).toLocaleString()}`
                  : new Date(b.sent_at || b.created_at).toLocaleString()}
              </span>
            </div>
            {b.error && (
              <p className="text-[10px] text-destructive">⚠ {b.error}</p>
            )}
            {b.status === 'pending' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => cancelPending(b.id)}
                className="h-7 text-[10px] gap-1 text-destructive hover:text-destructive"
              >
                <Trash2 className="w-3 h-3" /> Cancel
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
