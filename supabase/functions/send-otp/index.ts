import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
        return new Response(JSON.stringify({ error: 'email required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const { data: foundId, error: lookupErr } = await supabase.rpc('get_user_id_by_email', {
        _email: String(email).trim().toLowerCase(),
      });
      if (lookupErr || !foundId) {
        return new Response(JSON.stringify({ error: 'no_account' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      user_id = foundId;
    }

    // ── SEND OTP ──
    if (action === 'send' || action === 'send_by_email') {
      if (!user_id || !email) {
        return new Response(JSON.stringify({ error: 'user_id and email required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const otpHash = await hashOTP(otpCode);
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

      // Remove any existing OTPs for this user
      await supabase.from('email_otps').delete().eq('user_id', user_id);

      // Insert new OTP
      const { error: insertError } = await supabase.from('email_otps').insert({
        user_id,
        otp_hash: otpHash,
        expires_at: expiresAt,
        is_verified: false,
      });

      if (insertError) {
        return new Response(JSON.stringify({ error: insertError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Send email via Resend
      const resendKey = Deno.env.get('RESEND_API_KEY');
      if (!resendKey) {
        return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
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
        return new Response(JSON.stringify({ error: 'Failed to send email' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: true, user_id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    if (action === 'verify') {
      if (!user_id || !otp) {
        return new Response(JSON.stringify({ error: 'user_id and otp required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
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
        return new Response(JSON.stringify({ error: 'no_otp_found' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (new Date(otpRow.expires_at) < new Date()) {
        return new Response(JSON.stringify({ error: 'otp_expired' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const inputHash = await hashOTP(otp);
      if (inputHash !== otpRow.otp_hash) {
        return new Response(JSON.stringify({ error: 'invalid_otp' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Mark as verified
      await supabase.from('email_otps').update({ is_verified: true }).eq('id', otpRow.id);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── CHECK VERIFICATION STATUS ──
    if (action === 'check') {
      if (!user_id) {
        return new Response(JSON.stringify({ error: 'user_id required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: otpRow } = await supabase
        .from('email_otps')
        .select('is_verified')
        .eq('user_id', user_id)
        .eq('is_verified', true)
        .limit(1)
        .maybeSingle();

      return new Response(JSON.stringify({ is_verified: !!otpRow }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('send-otp error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
