import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Role = 'store' | 'driver';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function validate(input: any) {
  const email = String(input?.email ?? '').trim().toLowerCase();
  const password = String(input?.password ?? '');
  const fullName = String(input?.fullName ?? '').trim();
  const phone = String(input?.phone ?? '').trim();
  const role = input?.role as Role;

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Invalid email address');
  if (password.length < 6) throw new Error('Password must be at least 6 characters');
  if (!fullName || fullName.length > 100) throw new Error('Full name is required');
  if (!phone || phone.length > 30) throw new Error('Phone number is required');
  if (role !== 'store' && role !== 'driver') throw new Error('Invalid account type');

  return { email, password, fullName, phone, role };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const { email, password, fullName, phone, role } = validate(await req.json());

    let userId: string | null = null;
    let existingUser: any = null;

    for (let page = 1; page <= 20 && !existingUser; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) throw error;
      existingUser = data.users.find((u) => u.email?.toLowerCase() === email) ?? null;
      if (data.users.length < 1000) break;
    }

    if (existingUser) {
      userId = existingUser.id;
      const [{ data: roles }, { data: storeProfile }, { data: driverProfile }] = await Promise.all([
        admin.from('user_roles').select('role').eq('user_id', userId),
        admin.from('store_profiles').select('id').eq('user_id', userId).maybeSingle(),
        admin.from('driver_profiles').select('id,onboarding_completed').eq('user_id', userId).maybeSingle(),
      ]);

      const hasAppData = (roles?.length ?? 0) > 0 || !!storeProfile || !!driverProfile;
      const incompleteDriver = !!driverProfile && driverProfile.onboarding_completed !== true;

      if (hasAppData && !incompleteDriver) {
        return json({ error: 'user_already_exists' }, 409);
      }

      await Promise.all([
        admin.from('user_roles').delete().eq('user_id', userId),
        admin.from('store_profiles').delete().eq('user_id', userId),
        admin.from('driver_profiles').delete().eq('user_id', userId),
        admin.from('email_otps').delete().eq('user_id', userId),
      ]);

      const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
      if (deleteError) throw deleteError;
    }

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, phone, selected_role: role },
    });
    if (createError) throw createError;
    userId = created.user.id;

    const { error: roleError } = await admin
      .from('user_roles')
      .insert({ user_id: userId, role });
    if (roleError) throw roleError;

    if (role === 'store') {
      const { error } = await admin
        .from('store_profiles')
        .insert({ user_id: userId, store_name: fullName, phone });
      if (error) throw error;
    } else {
      const { error } = await admin
        .from('driver_profiles')
        .insert({ user_id: userId, full_name: fullName, phone, onboarding_completed: false });
      if (error) throw error;
    }

    return json({ user_id: userId, email, role });
  } catch (err) {
    console.error('signup-user failed', err);
    return json({ error: err instanceof Error ? err.message : 'Signup failed' }, 400);
  }
});