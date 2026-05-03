// Send a push notification via OneSignal to one or more Supabase user IDs
// (mapped to OneSignal external_id via OneSignal.login(userId) in the app).
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID')!;
const ONESIGNAL_REST_API_KEY = Deno.env.get('ONESIGNAL_REST_API_KEY')!;

interface Payload {
  user_id?: string;
  user_ids?: string[];
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = (await req.json()) as Payload;
    const ids = payload.user_ids ?? (payload.user_id ? [payload.user_id] : []);
    if (ids.length === 0 || !payload.title || !payload.body) {
      return json({ error: 'user_id(s), title and body are required' }, 400);
    }
    if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
      return json({ error: 'OneSignal env vars not configured' }, 500);
    }

    // OneSignal allows up to 2000 external_ids per request
    const results: any[] = [];
    for (let i = 0; i < ids.length; i += 2000) {
      const chunk = ids.slice(i, i + 2000);
      const res = await fetch('https://api.onesignal.com/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Key ${ONESIGNAL_REST_API_KEY}`,
        },
        body: JSON.stringify({
          app_id: ONESIGNAL_APP_ID,
          target_channel: 'push',
          include_aliases: { external_id: chunk },
          headings: { en: payload.title },
          contents: { en: payload.body },
          data: payload.data ?? {},
        }),
      });
      const j = await res.json();
      results.push(j);
    }

    return json({ ok: true, results });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
