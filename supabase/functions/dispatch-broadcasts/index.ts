// Dispatch admin broadcasts: fan out into the notifications table.
// Triggered by pg_cron every minute, and also callable on-demand from the admin UI
// (with `broadcast_id` in the body) for "Send now" flow.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  let onlyId: string | null = null;
  try {
    const body = await req.json().catch(() => ({}));
    if (body && typeof body.broadcast_id === 'string') {
      onlyId = body.broadcast_id;
    }
  } catch {
    /* no body */
  }

  // Pick pending broadcasts that are due
  let query = supabase
    .from('admin_broadcasts')
    .select('*')
    .eq('status', 'pending');

  if (onlyId) {
    query = query.eq('id', onlyId);
  } else {
    query = query.or('send_at.is.null,send_at.lte.' + new Date().toISOString());
  }

  const { data: broadcasts, error } = await query.limit(20);
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const results: Array<{ id: string; recipients: number; status: string }> = [];

  for (const b of broadcasts ?? []) {
    try {
      const recipientIds = await resolveAudience(supabase, b);

      if (recipientIds.length === 0) {
        await supabase
          .from('admin_broadcasts')
          .update({
            status: 'failed',
            error: 'No recipients matched audience',
            sent_at: new Date().toISOString(),
          })
          .eq('id', b.id);
        results.push({ id: b.id, recipients: 0, status: 'failed' });
        continue;
      }

      // Insert in chunks of 500
      const rows = recipientIds.map((uid) => ({
        user_id: uid,
        title: b.title,
        body: b.body,
        type: 'admin_broadcast',
      }));

      for (let i = 0; i < rows.length; i += 500) {
        const chunk = rows.slice(i, i + 500);
        const { error: insErr } = await supabase
          .from('notifications')
          .insert(chunk);
        if (insErr) throw insErr;
      }

      let pushWarning: string | null = null;

      // Fire OneSignal push (best-effort; don't fail broadcast if push fails)
      try {
        const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID');
        const ONESIGNAL_REST_API_KEY = Deno.env.get('ONESIGNAL_REST_API_KEY');
        if (ONESIGNAL_APP_ID && ONESIGNAL_REST_API_KEY) {
          const pushErrors: string[] = [];
          for (let i = 0; i < recipientIds.length; i += 2000) {
            const chunk = recipientIds.slice(i, i + 2000);
            const pushRes = await fetch('https://api.onesignal.com/notifications', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Key ${ONESIGNAL_REST_API_KEY}`,
              },
              body: JSON.stringify({
                app_id: ONESIGNAL_APP_ID,
                target_channel: 'push',
                include_aliases: { external_id: chunk },
                headings: { en: b.title },
                contents: { en: b.body },
                data: { type: 'admin_broadcast', broadcast_id: b.id },
              }),
            });
            const pushJson = await pushRes.json().catch(() => ({}));
            if (!pushRes.ok || pushJson.errors) {
              pushErrors.push(JSON.stringify(pushJson.errors ?? pushJson));
            }
          }
          if (pushErrors.length > 0) {
            pushWarning = `OneSignal: ${pushErrors.join('; ')}`;
            console.error(`OneSignal push errors for broadcast ${b.id}: ${pushWarning}`);
          }
        }
      } catch (_pushErr) {
        pushWarning = `OneSignal: ${(_pushErr as Error).message}`;
        console.error(`OneSignal push failed for broadcast ${b.id}:`, _pushErr);
      }

      await supabase
        .from('admin_broadcasts')
        .update({
          status: 'sent',
          recipients_count: recipientIds.length,
          sent_at: new Date().toISOString(),
          error: pushWarning,
        })
        .eq('id', b.id);

      results.push({
        id: b.id,
        recipients: recipientIds.length,
        status: 'sent',
      });
    } catch (e) {
      await supabase
        .from('admin_broadcasts')
        .update({
          status: 'failed',
          error: (e as Error).message,
          sent_at: new Date().toISOString(),
        })
        .eq('id', b.id);
      results.push({ id: b.id, recipients: 0, status: 'failed' });
    }
  }

  return new Response(
    JSON.stringify({ processed: results.length, results }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    },
  );
});

async function resolveAudience(
  supabase: ReturnType<typeof createClient>,
  b: {
    audience: string;
    target_user_id: string | null;
  },
): Promise<string[]> {
  if (b.audience === 'user') {
    return b.target_user_id ? [b.target_user_id] : [];
  }

  if (b.audience === 'drivers') {
    const { data } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'driver');
    return (data ?? []).map((r: any) => r.user_id);
  }

  if (b.audience === 'stores') {
    const { data } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'store');
    return (data ?? []).map((r: any) => r.user_id);
  }

  // 'all' — every user with any role (drivers + stores; admins get them too).
  const { data } = await supabase.from('user_roles').select('user_id');
  const set = new Set<string>((data ?? []).map((r: any) => r.user_id));
  return Array.from(set);
}
