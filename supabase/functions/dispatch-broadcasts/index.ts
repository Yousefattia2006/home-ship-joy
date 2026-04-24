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

      await supabase
        .from('admin_broadcasts')
        .update({
          status: 'sent',
          recipients_count: recipientIds.length,
          sent_at: new Date().toISOString(),
          error: null,
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
