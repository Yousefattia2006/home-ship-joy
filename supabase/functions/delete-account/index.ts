import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: claimsErr } = await userClient.auth.getUser(token);
    if (claimsErr || !userData?.user?.id) return json({ error: 'Unauthorized' }, 401);

    const userId = userData.user.id;

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // Best-effort cleanup of app data; auth.users delete will cascade where FKs exist.
    await Promise.all([
      admin.from('user_roles').delete().eq('user_id', userId),
      admin.from('store_profiles').delete().eq('user_id', userId),
      admin.from('driver_profiles').delete().eq('user_id', userId),
      admin.from('email_otps').delete().eq('user_id', userId),
      admin.from('profiles').delete().eq('user_id', userId),
      admin.from('push_tokens').delete().eq('user_id', userId),
      admin.from('notifications').delete().eq('user_id', userId),
    ]);

    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) throw error;

    return json({ success: true });
  } catch (err) {
    console.error('delete-account failed', err);
    return json({ error: err instanceof Error ? err.message : 'Delete failed' }, 400);
  }
});
