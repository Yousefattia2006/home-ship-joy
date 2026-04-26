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

// Resets a user's password ONLY if they have a verified OTP within the last 10 minutes.
// Client must pass: { email, new_password }. We look up the user, verify OTP state, then update.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const { email, new_password } = await req.json();
    const cleanEmail = String(email ?? '').trim().toLowerCase();
    const password = String(new_password ?? '');

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return json({ error: 'Invalid email' }, 400);
    }
    if (password.length < 6) {
      return json({ error: 'Password must be at least 6 characters' }, 400);
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const { data: userId } = await admin.rpc('get_user_id_by_email', { _email: cleanEmail });
    if (!userId) return json({ error: 'no_account' }, 404);

    // Require a verified OTP from the last 10 minutes
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: otp } = await admin
      .from('email_otps')
      .select('id, created_at')
      .eq('user_id', userId)
      .eq('is_verified', true)
      .gte('created_at', tenMinAgo)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!otp) return json({ error: 'otp_required' }, 403);

    const { error } = await admin.auth.admin.updateUserById(userId, { password });
    if (error) throw error;

    // Burn the OTP so it can't be reused
    await admin.from('email_otps').delete().eq('user_id', userId);

    return json({ success: true });
  } catch (err) {
    console.error('reset-password failed', err);
    return json({ error: err instanceof Error ? err.message : 'Reset failed' }, 400);
  }
});
