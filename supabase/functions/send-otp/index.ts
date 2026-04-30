import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

async function hashOTP(otp: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(otp);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const body = await req.json();
    const { action, email, otp } = body;
    let { user_id } = body;

    // Convenience: look up user_id by email (used by forgot-password and post-signup verification)
    if (action === 'send_by_email') {
      if (!email) {
        return json({ error: 'email required' }, 400);
      }
      const { data: foundId, error: lookupErr } = await supabase.rpc('get_user_id_by_email', {
        _email: String(email).trim().toLowerCase(),
      });
      if (lookupErr || !foundId) {
        return json({ error: 'no_account' }, 404);
      }
      user_id = foundId;
    }

    // ── SEND OTP ──
    if (action === 'send' || action === 'send_by_email') {
      if (!user_id || !email) {
        return json({ error: 'user_id and email required' }, 400);
      }

      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const otpHash = await hashOTP(otpCode);
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

      // Remove any existing OTPs for this user
      await supabase.from('email_otps').delete().eq('user_id', user_id).eq('is_verified', false);

      // Insert new OTP
      const { error: insertError } = await supabase.from('email_otps').insert({
        user_id,
        otp_hash: otpHash,
        expires_at: expiresAt,
        is_verified: false,
      });

      if (insertError) {
        return json({ error: insertError.message }, 500);
      }

      // Send email via Resend
      const resendKey = Deno.env.get('RESEND_API_KEY');
      if (!resendKey) {
        return json({ error: 'RESEND_API_KEY not configured' }, 500);
      }

      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
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
        await supabase.from('email_otps').delete().eq('user_id', user_id).eq('otp_hash', otpHash);
        return json({ error: 'Failed to send email' }, 500);
      }

      return json({ success: true, user_id });
    }

    // ── VERIFY OTP ──
    if (action === 'verify') {
      if (!user_id || !otp) {
        return json({ error: 'user_id and otp required' }, 400);
      }

      const { data: otpRow, error } = await supabase
        .from('email_otps')
        .select('*')
        .eq('user_id', user_id)
        .eq('is_verified', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !otpRow) {
        return json({ error: 'no_otp_found' }, 400);
      }

      if (new Date(otpRow.expires_at) < new Date()) {
        await supabase.from('email_otps').delete().eq('id', otpRow.id);
        return json({ error: 'otp_expired' }, 400);
      }

      const inputHash = await hashOTP(otp);
      if (inputHash !== otpRow.otp_hash) {
        return json({ error: 'invalid_otp' }, 400);
      }

      // Mark as verified
      await supabase.from('email_otps').update({ is_verified: true }).eq('id', otpRow.id);

      return json({ success: true });
    }

    // ── CHECK VERIFICATION STATUS ──
    if (action === 'check') {
      if (!user_id) {
        return json({ error: 'user_id required' }, 400);
      }

      const { data: otpRow } = await supabase
        .from('email_otps')
        .select('is_verified')
        .eq('user_id', user_id)
        .eq('is_verified', true)
        .limit(1)
        .maybeSingle();

      if (otpRow) return json({ is_verified: true });

      // Fallback: treat already-confirmed auth users as verified
      // so existing accounts created before the OTP gate still pass.
      try {
        const { data: userRes } = await supabase.auth.admin.getUserById(user_id);
        const confirmed = !!userRes?.user?.email_confirmed_at;
        return json({ is_verified: confirmed });
      } catch {
        return json({ is_verified: false });
      }
    }

    return json({ error: 'Invalid action' }, 400);
  } catch (err) {
    console.error('send-otp error:', err);
    return json({ error: 'Internal server error' }, 500);
  }
});
