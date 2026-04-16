import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, authorization',
};

const TOSS_IAP_VERIFY_URL = 'https://api.toss.im/v1/billing/in-app-purchase/orders';
const CERT_PEM = Deno.env.get('TOSS_CLIENT_CERT') ?? '';
const KEY_PEM = Deno.env.get('TOSS_CLIENT_KEY') ?? '';
const CREDITS_PER_PURCHASE = 10;

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

async function mTLSGet(url: string, bearerToken: string): Promise<unknown> {
  const parsed = new URL(url);
  const hostname = parsed.hostname;
  const path = parsed.pathname + parsed.search;

  const conn = await Deno.connectTls({
    hostname,
    port: 443,
    certChain: CERT_PEM,
    privateKey: KEY_PEM,
  });

  const request = [
    `GET ${path} HTTP/1.1`,
    `Host: ${hostname}`,
    `Authorization: Bearer ${bearerToken}`,
    'Connection: close',
    '',
    '',
  ].join('\r\n');

  await conn.write(new TextEncoder().encode(request));

  const buf = new Uint8Array(65536);
  let raw = '';
  while (true) {
    const n = await conn.read(buf);
    if (n === null) break;
    raw += new TextDecoder().decode(buf.subarray(0, n));
  }
  conn.close();

  const bodyStart = raw.indexOf('\r\n\r\n');
  if (bodyStart === -1) throw new Error('Invalid mTLS response');
  return JSON.parse(raw.slice(bodyStart + 4).trim());
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS });
  }

  try {
    // Authenticate caller via Supabase JWT
    const authHeader = req.headers.get('authorization') ?? '';
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const { orderId } = await req.json();
    if (!orderId) {
      return new Response(JSON.stringify({ error: 'missing orderId' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // Verify IAP order with Toss (mTLS required)
    const orderData = await mTLSGet(
      `${TOSS_IAP_VERIFY_URL}/${orderId}`,
      token,
    ) as { status: string; productId: string; userId: string };

    if (orderData.status !== 'DONE') {
      return new Response(JSON.stringify({ error: 'order not completed' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    if (orderData.productId !== 'ai_credits_10') {
      return new Response(JSON.stringify({ error: 'unknown product' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // Grant credits
    const { data: userRow, error: userErr } = await supabaseAdmin
      .from('users')
      .select('ai_credits')
      .eq('id', user.id)
      .single();

    if (userErr || !userRow) throw new Error('user not found');

    const newCredits = userRow.ai_credits + CREDITS_PER_PURCHASE;
    await supabaseAdmin
      .from('users')
      .update({ ai_credits: newCredits })
      .eq('id', user.id);

    return new Response(JSON.stringify({ ai_credits: newCredits }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('grant-ai-credits error:', e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
