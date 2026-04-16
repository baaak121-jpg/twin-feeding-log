import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, authorization',
};

const TOSS_HOST = 'apps-in-toss-api.toss.im';
const TOSS_TOKEN_PATH = '/api-partner/v1/apps-in-toss/user/oauth2/generate-token';
const TOSS_USERINFO_PATH = '/api-partner/v1/apps-in-toss/user/oauth2/login-me';

// mTLS: read client cert + key from environment
const CERT_PEM = Deno.env.get('TOSS_CLIENT_CERT') ?? '';
const KEY_PEM = Deno.env.get('TOSS_CLIENT_KEY') ?? '';

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

/**
 * Make an mTLS HTTP/1.1 request to a Toss API endpoint.
 */
async function mTLSRequest(
  method: 'GET' | 'POST',
  path: string,
  body?: string,
  extraHeaders: Record<string, string> = {},
): Promise<unknown> {
  const conn = await Deno.connectTls({
    hostname: TOSS_HOST,
    port: 443,
    certChain: CERT_PEM,
    privateKey: KEY_PEM,
  });

  const bodyBytes = body ? new TextEncoder().encode(body) : null;

  const headers: Record<string, string> = {
    Host: TOSS_HOST,
    Connection: 'close',
    ...extraHeaders,
  };
  if (bodyBytes) {
    headers['Content-Length'] = String(bodyBytes.length);
  }

  const headerLines = [
    `${method} ${path} HTTP/1.1`,
    ...Object.entries(headers).map(([k, v]) => `${k}: ${v}`),
    '',
    '',
  ].join('\r\n');

  const requestBytes = new Uint8Array([
    ...new TextEncoder().encode(headerLines),
    ...(bodyBytes ?? []),
  ]);

  await conn.write(requestBytes);

  const chunks: Uint8Array[] = [];
  const buf = new Uint8Array(65536);
  while (true) {
    const n = await conn.read(buf);
    if (n === null) break;
    chunks.push(buf.slice(0, n));
  }
  conn.close();

  const raw = new TextDecoder().decode(
    chunks.reduce((acc, c) => {
      const merged = new Uint8Array(acc.length + c.length);
      merged.set(acc);
      merged.set(c, acc.length);
      return merged;
    }, new Uint8Array(0)),
  );

  const bodyStart = raw.indexOf('\r\n\r\n');
  if (bodyStart === -1) throw new Error('Invalid mTLS response');
  const jsonBody = raw.slice(bodyStart + 4).trim();
  return JSON.parse(jsonBody);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS });
  }

  try {
    const { authorizationCode, referrer } = await req.json();
    if (!authorizationCode) {
      return new Response(JSON.stringify({ error: 'missing authorizationCode' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // 1. 인가 코드 → Toss AccessToken 교환 (mTLS, JSON)
    const tokenBody = JSON.stringify({ authorizationCode, referrer });
    const tokenData = await mTLSRequest('POST', TOSS_TOKEN_PATH, tokenBody, {
      'Content-Type': 'application/json',
    }) as { resultType: string; success?: { accessToken: string } };

    if (tokenData.resultType !== 'SUCCESS' || !tokenData.success?.accessToken) {
      throw new Error(`토큰 교환 실패: ${JSON.stringify(tokenData)}`);
    }

    const tossAccessToken = tokenData.success.accessToken;

    // 2. 사용자 정보 조회 (mTLS, GET)
    const userInfo = await mTLSRequest('GET', TOSS_USERINFO_PATH, undefined, {
      Authorization: `Bearer ${tossAccessToken}`,
    }) as { resultType: string; success?: { userKey: number } };

    if (userInfo.resultType !== 'SUCCESS' || !userInfo.success?.userKey) {
      throw new Error(`사용자 정보 조회 실패: ${JSON.stringify(userInfo)}`);
    }

    const tossUserKey = userInfo.success.userKey;

    // 3. DB에서 유저 조회/생성
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
      const { data: authUser, error: authErr } = await supabaseAdmin.auth.admin.createUser({
        email: `${tossUserKey}@toss.internal`,
        email_confirm: true,
        user_metadata: { toss_user_key: tossUserKey },
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

    // 4. Supabase 세션 발급
    const { data: supaSession, error: supaErr } = await supabaseAdmin.auth.admin.createSession(userId);
    if (supaErr) throw supaErr;

    return new Response(JSON.stringify({
      access_token: supaSession.session.access_token,
      refresh_token: supaSession.session.refresh_token,
      user: { id: userId, toss_user_key: tossUserKey, ai_credits: aiCredits },
    }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('toss-auth error:', e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
