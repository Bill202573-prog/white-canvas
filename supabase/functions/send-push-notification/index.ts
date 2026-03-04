import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ---- Base64url helpers ----
function base64urlToUint8Array(b64url: string): Uint8Array {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function uint8ArrayToBase64url(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// ---- VAPID JWT ----
async function createVapidJwt(audience: string, subject: string, privateKeyB64url: string, publicKeyB64url: string): Promise<string> {
  const header = { typ: 'JWT', alg: 'ES256' };
  const now = Math.floor(Date.now() / 1000);
  const payload = { aud: audience, exp: now + 12 * 3600, sub: subject };

  const headerB64 = uint8ArrayToBase64url(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = uint8ArrayToBase64url(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Derive x, y from the uncompressed public key (65 bytes: 0x04 || x(32) || y(32))
  const pubBytes = base64urlToUint8Array(publicKeyB64url);
  const x = uint8ArrayToBase64url(pubBytes.slice(1, 33));
  const y = uint8ArrayToBase64url(pubBytes.slice(33, 65));

  const key = await crypto.subtle.importKey(
    'jwk',
    { kty: 'EC', crv: 'P-256', d: privateKeyB64url, x, y },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  const signature = new Uint8Array(
    await crypto.subtle.sign(
      { name: 'ECDSA', hash: 'SHA-256' },
      key,
      new TextEncoder().encode(unsignedToken)
    )
  );

  // Convert DER signature to raw r||s (64 bytes)
  const rawSig = derToRaw(signature);
  const sigB64 = uint8ArrayToBase64url(rawSig);
  return `${unsignedToken}.${sigB64}`;
}

function derToRaw(derSig: Uint8Array): Uint8Array {
  // If already 64 bytes, assume raw
  if (derSig.length === 64) return derSig;

  // Parse DER SEQUENCE
  let offset = 2; // skip 0x30 + length
  if (derSig[1] & 0x80) offset += (derSig[1] & 0x7f);

  // R
  offset++; // 0x02
  const rLen = derSig[offset++];
  const rStart = offset;
  offset += rLen;

  // S
  offset++; // 0x02
  const sLen = derSig[offset++];
  const sStart = offset;

  const r = derSig.slice(rStart, rStart + rLen);
  const s = derSig.slice(sStart, sStart + sLen);

  const raw = new Uint8Array(64);
  raw.set(r.length > 32 ? r.slice(r.length - 32) : r, 32 - Math.min(r.length, 32));
  raw.set(s.length > 32 ? s.slice(s.length - 32) : s, 64 - Math.min(s.length, 32));
  return raw;
}

// ---- Web Push Encryption (aes128gcm) ----
async function encryptPayload(
  payload: string,
  p256dhB64url: string,
  authB64url: string
): Promise<{ ciphertext: Uint8Array; salt: Uint8Array; localPublicKey: Uint8Array }> {
  const clientPublicKeyBytes = base64urlToUint8Array(p256dhB64url);
  const authSecret = base64urlToUint8Array(authB64url);

  // Generate local ECDH key pair
  const localKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );

  // Import client public key
  const clientPublicKey = await crypto.subtle.importKey(
    'raw',
    clientPublicKeyBytes,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );

  // Derive shared secret
  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: 'ECDH', public: clientPublicKey },
      localKeyPair.privateKey,
      256
    )
  );

  // Export local public key
  const localPublicKey = new Uint8Array(
    await crypto.subtle.exportKey('raw', localKeyPair.publicKey)
  );

  // Generate salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // HKDF to derive encryption key and nonce
  const ikmInfo = new TextEncoder().encode('WebPush: info\0');
  const ikm = await hkdfExtractAndExpand(
    authSecret,
    sharedSecret,
    concatUint8Arrays(ikmInfo, clientPublicKeyBytes, localPublicKey),
    32
  );

  const contentEncryptionKeyInfo = new TextEncoder().encode('Content-Encoding: aes128gcm\0');
  const cek = await hkdfExtractAndExpand(salt, ikm, contentEncryptionKeyInfo, 16);

  const nonceInfo = new TextEncoder().encode('Content-Encoding: nonce\0');
  const nonce = await hkdfExtractAndExpand(salt, ikm, nonceInfo, 12);

  // Pad and encrypt
  const paddedPayload = concatUint8Arrays(new TextEncoder().encode(payload), new Uint8Array([2]));

  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, paddedPayload)
  );

  // Build aes128gcm body: salt(16) + rs(4) + idlen(1) + keyid(65) + ciphertext
  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096);

  const body = concatUint8Arrays(
    salt,
    rs,
    new Uint8Array([localPublicKey.length]),
    localPublicKey,
    encrypted
  );

  return { ciphertext: body, salt, localPublicKey };
}

async function hkdfExtractAndExpand(
  salt: Uint8Array,
  ikm: Uint8Array,
  info: Uint8Array,
  length: number
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', salt, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const prk = new Uint8Array(await crypto.subtle.sign('HMAC', key, ikm));

  const infoWithCounter = concatUint8Arrays(info, new Uint8Array([1]));
  const expandKey = await crypto.subtle.importKey('raw', prk, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const result = new Uint8Array(await crypto.subtle.sign('HMAC', expandKey, infoWithCounter));

  return result.slice(0, length);
}

function concatUint8Arrays(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((acc, arr) => acc + arr.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

// ---- Send Push ----
async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  vapidSubject: string
): Promise<Response> {
  const url = new URL(subscription.endpoint);
  const audience = `${url.protocol}//${url.host}`;

  const jwt = await createVapidJwt(audience, vapidSubject, vapidPrivateKey, vapidPublicKey);
  const vapidPubBytes = base64urlToUint8Array(vapidPublicKey);
  const vapidKeyB64 = uint8ArrayToBase64url(vapidPubBytes);

  const { ciphertext } = await encryptPayload(payload, subscription.p256dh, subscription.auth);

  const response = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `vapid t=${jwt}, k=${vapidKeyB64}`,
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      'TTL': '86400',
      'Urgency': 'high',
    },
    body: ciphertext,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    const error: any = new Error(`Push failed: ${response.status} ${errorBody}`);
    error.statusCode = response.status;
    throw error;
  }

  return response;
}

// ---- Main handler ----
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')!;
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { user_ids, title, body, url, tag, tipo, referencia_id, dias_antes, escolinha_id } = await req.json();

    if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
      return new Response(JSON.stringify({ error: 'user_ids required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .in('user_id', user_ids);

    if (subError) throw subError;
    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: 'No subscriptions found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = JSON.stringify({
      title: title || 'Bola Presente',
      body: body || '',
      url: url || '/dashboard',
      tag: tag || 'default',
      icon: '/pwa-icon-192.png',
    });

    let sent = 0;
    let failed = 0;
    const expiredEndpoints: string[] = [];

    for (const sub of subscriptions) {
      try {
        await sendWebPush(
          { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
          payload,
          vapidPublicKey,
          vapidPrivateKey,
          'mailto:contato@atletaid.com.br'
        );
        sent++;

        if (tipo) {
          await supabase.from('push_notifications_log').insert({
            user_id: sub.user_id,
            escolinha_id: escolinha_id || null,
            tipo,
            referencia_id: referencia_id || null,
            dias_antes: dias_antes ?? null,
            titulo: title || 'Bola Presente',
            mensagem: body || '',
            entregue: true,
          });
        }
      } catch (err: any) {
        console.error(`Push failed for ${sub.endpoint}:`, err.message);
        failed++;

        if (err.statusCode === 410 || err.statusCode === 404) {
          expiredEndpoints.push(sub.endpoint);
        }
      }
    }

    if (expiredEndpoints.length > 0) {
      await supabase
        .from('push_subscriptions')
        .delete()
        .in('endpoint', expiredEndpoints);
    }

    return new Response(JSON.stringify({ sent, failed, expired: expiredEndpoints.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('Push notification error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
