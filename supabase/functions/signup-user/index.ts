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

async function hashOTP(otp: string): Promise<string> {
  const encoder = new TextEncoder();
  const hash = await crypto.subtle.digest('SHA-256', encoder.encode(otp));
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function sendOtpEmail(admin: any, userId: string, email: string) {
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const otpHash = await hashOTP(otpCode);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  await admin.from('email_otps').delete().eq('user_id', userId).eq('is_verified', false);
  const { error: insertError } = await admin.from('email_otps').insert({
    user_id: userId,
    otp_hash: otpHash,
    expires_at: expiresAt,
    is_verified: false,
  });
  if (insertError) throw new Error(`Failed to store OTP: ${insertError.message}`);

  const resendKey = Deno.env.get('RESEND_API_KEY');
  if (!resendKey) {
    console.error('RESEND_API_KEY not configured — skipping email send');
    return;
  }

  const emailRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'noreply@broo-eg.com',
      to: email,
      subject: 'Your verification code — Tawseel',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
          <h1 style="font-size: 24px; color: #1a1a1a; margin-bottom: 8px;">Verify your email</h1>
          <p style="color: #666; font-size: 16px;">Use the code below to verify your Tawseel account:</p>
          <div style="background: #f4f4f5; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
            <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #1a1a1a;">${otpCode}</span>
          </div>
          <p style="color: #999; font-size: 14px;">This code expires in 5 minutes. If you didn't request this, ignore this email.</p>
        </div>
      `,
    }),
  });

  if (!emailRes.ok) {
    const errBody = await emailRes.text();
    console.error('Resend error:', errBody);
    await admin.from('email_otps').delete().eq('user_id', userId).eq('otp_hash', otpHash);
    throw new Error('Failed to send verification email');
  }
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

    const { data: existingUserId } = await admin.rpc('get_user_id_by_email', { _email: email });
    let userId: string | null = existingUserId ?? null;

    if (userId) {
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

      const { error: deleteError } = await admin.auth.admin.deleteUser(userId!);
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

    // Send the verification OTP as part of signup so the client doesn't need to call send-otp
    try {
      await sendOtpEmail(admin, userId, email);
    } catch (e) {
      console.error('OTP email failed during signup:', e);
      // Don't fail signup just because email failed; client can request resend
    }

    return json({ user_id: userId, email, role });
  } catch (err) {
    console.error('signup-user failed', err);
    return json({ error: err instanceof Error ? err.message : 'Signup failed' }, 400);
  }
});
