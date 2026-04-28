import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_EMAIL = "yousefattia81@gmail.com";
const ADMIN_PASSWORD = "Yousefatia@810";
const ADMIN_NAME = "Yousef Attia";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Check if user already exists
    const { data: existing } = await admin.rpc("get_user_id_by_email", { _email: ADMIN_EMAIL });
    let userId: string | null = (existing as string | null) ?? null;

    if (!userId) {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: ADMIN_NAME },
      });
      if (createErr) throw createErr;
      userId = created.user!.id;
    } else {
      // Update password to make sure it matches
      await admin.auth.admin.updateUserById(userId, {
        password: ADMIN_PASSWORD,
        email_confirm: true,
      });
    }

    // Ensure admin role
    await admin.from("user_roles").upsert(
      { user_id: userId, role: "admin" },
      { onConflict: "user_id,role" },
    );

    // Mark email OTP as verified so RequireVerified doesn't gate (admin already bypasses, but be safe)
    await admin.from("email_otps").insert({
      user_id: userId,
      otp_hash: "bootstrap",
      is_verified: true,
      expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString(),
    }).then(() => {}).catch(() => {});

    return new Response(JSON.stringify({ ok: true, user_id: userId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
