import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, authorization',
};

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS });
  }

  try {
    const { hash } = await req.json();
    if (!hash || typeof hash !== 'string') {
      return new Response(JSON.stringify({ error: 'missing hash' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // hash(string) → bigint 변환 (앞 12자리 hex → 48bit 숫자, JS safe integer 범위 내)
    const tossUserKey = parseInt(hash.slice(0, 12), 16);

    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id, ai_credits')
      .eq('toss_user_key', tossUserKey)
      .maybeSingle();

    let userId: string;
    let aiCredits: number;

    if (existingUser) {
      userId = existingUser.id;
      aiCredits = existingUser.ai_credits;
    } else {
      const email = `${hash.slice(0, 20)}@anon.toss`;
      const { data: authUser, error: authErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: true,
      });
      if (authErr) throw authErr;

      userId = authUser.user.id;
      aiCredits = 10;

      await supabaseAdmin.from('users').insert({
        id: userId,
        toss_user_key: tossUserKey,
        ai_credits: aiCredits,
      });
    }

    const { data: supaSession, error: sessionErr } = await supabaseAdmin.auth.admin.createSession(userId);
    if (sessionErr) throw sessionErr;

    return new Response(JSON.stringify({
      access_token: supaSession.session.access_token,
      refresh_token: supaSession.session.refresh_token,
      user: { id: userId, toss_user_key: tossUserKey, ai_credits: aiCredits },
    }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('anon-auth error:', e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
