import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient as createClientNpm } from '@supabase/supabase-js';
import { createClient as createClientEsm } from 'https://esm.sh/@supabase/supabase-js@2';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function getEnvVar(key: string): string | undefined {
  if (typeof Deno !== 'undefined' && Deno.env) {
    return Deno.env.get(key);
  }
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key];
  }
  return undefined;
}

function getSupabaseClient(url: string, key: string) {
  const fn = typeof createClientNpm === 'function' ? createClientNpm : createClientEsm;
  return fn(url, key);
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(signature), byte => byte.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let i = 0; i < left.length; i += 1) {
    mismatch |= left.charCodeAt(i) ^ right.charCodeAt(i);
  }
  return mismatch === 0;
}

export async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = getEnvVar('SUPABASE_URL');
    const supabaseServiceKey = getEnvVar('SUPABASE_SERVICE_ROLE_KEY');
    const razorpayKeyId = getEnvVar('RAZORPAY_KEY_ID');
    const razorpayKeySecret = getEnvVar('RAZORPAY_KEY_SECRET');

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Supabase configuration missing.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!razorpayKeyId || !razorpayKeySecret) {
      return new Response(
        JSON.stringify({
          error: 'Razorpay merchant credentials are not configured on the server. Payment verification cannot be completed until merchant credentials are provided.',
          code: 'PAYMENT_GATEWAY_UNAVAILABLE',
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = getSupabaseClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized user session: ' + (userError?.message || 'no user') }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { internal_order_id, razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

    if (!internal_order_id || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return new Response(
        JSON.stringify({ error: 'Incomplete payment verification payload.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch internal order details (ownership and recorded identifiers only).
    const { data: order, error: orderError } = await supabaseClient
      .from('orders')
      .select('id, user_id, total, razorpay_order_id')
      .eq('id', internal_order_id)
      .single();

    if (orderError || !order) {
      throw new Error('Order not found for verification.');
    }

    if (order.user_id !== user.id) {
      throw new Error('Unauthorized order verification request.');
    }

    // Guard: the submitted Razorpay order must be the one recorded for this order.
    if (order.razorpay_order_id !== razorpay_order_id) {
      throw new Error('Razorpay order ID mismatch. The payment submitted does not belong to this order.');
    }

    // HMAC signature verification.
    const payload = `${razorpay_order_id}|${razorpay_payment_id}`;
    const generatedSignature = await hmacSha256Hex(razorpayKeySecret, payload);
    const isValidSignature = timingSafeEqual(generatedSignature, String(razorpay_signature));

    if (!isValidSignature) {
      // Rejected payment: the database decides the transition and releases any
      // still-held reservation exactly once. A paid order is never downgraded.
      await supabaseClient.rpc('fail_razorpay_payment', {
        p_order_id: internal_order_id,
        p_reason: 'invalid_signature',
      });
      throw new Error('Invalid Razorpay payment signature. Verification failed.');
    }

    // Server-side payment lookup: never trust the client-reported status.
    const rzpPaymentRes = await fetch(`https://api.razorpay.com/v1/payments/${razorpay_payment_id}`, {
      method: 'GET',
      headers: {
        'Authorization': 'Basic ' + btoa(`${razorpayKeyId}:${razorpayKeySecret}`),
      },
    });

    if (!rzpPaymentRes.ok) {
      const errorText = await rzpPaymentRes.text();
      throw new Error(`Razorpay API payment lookup failed (${rzpPaymentRes.status}): ${errorText}`);
    }

    const rzpPaymentData = await rzpPaymentRes.json();

    if (rzpPaymentData.order_id !== razorpay_order_id) {
      throw new Error('Razorpay API payment record does not match the requested order.');
    }

    const expectedAmountInPaise = Math.round(Number(order.total) * 100);
    if (Number(rzpPaymentData.amount) !== expectedAmountInPaise || rzpPaymentData.currency !== 'INR') {
      throw new Error('Razorpay payment amount mismatch.');
    }

    // Only a captured payment is accepted.
    if (rzpPaymentData.status !== 'captured') {
      throw new Error(`Razorpay payment status '${rzpPaymentData.status}' is not captured. Only captured payments are accepted.`);
    }

    // Single atomic transition: idempotency, reservation expiry and exactly-once
    // stock release are all decided inside the database, under a row lock, so
    // this cannot race the expiry cleanup job.
    const { data: transition, error: transitionError } = await supabaseClient.rpc('confirm_razorpay_payment', {
      p_order_id: internal_order_id,
      p_payment_id: razorpay_payment_id,
      p_amount_paise: expectedAmountInPaise,
      p_razorpay_order_id: razorpay_order_id,
    });

    if (transitionError) {
      throw new Error('Payment confirmation could not be recorded: ' + transitionError.message);
    }

    const outcome = (transition as { outcome?: string } | null)?.outcome;

    if (outcome === 'confirmed' || outcome === 'already_paid') {
      return new Response(
        JSON.stringify({
          verified: true,
          payment_status: 'paid',
          internal_order_id,
          message: outcome === 'already_paid'
            ? 'Payment has already been verified for this order.'
            : 'Payment verified and order confirmed successfully.',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (outcome === 'reconciliation' || outcome === 'already_reconciliation') {
      return new Response(
        JSON.stringify({
          verified: false,
          payment_received: true,
          review_required: true,
          payment_status: 'requires_reconciliation',
          internal_order_id,
          message: 'Payment was captured, but the stock reservation had expired. Flagged for manual inventory reconciliation or refund.',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (outcome === 'payment_mismatch') {
      throw new Error('Razorpay payment ID mismatch for this order.');
    }
    if (outcome === 'order_mismatch') {
      throw new Error('Razorpay order ID mismatch. The payment submitted does not belong to this order.');
    }
    if (outcome === 'amount_mismatch') {
      throw new Error('Razorpay payment amount mismatch.');
    }
    if (outcome === 'not_capturable') {
      throw new Error('This order can no longer accept a captured payment.');
    }
    if (outcome === 'not_found') {
      throw new Error('Order not found for verification.');
    }

    throw new Error('Payment confirmation returned an unrecognised outcome.');
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Payment verification failed.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

if (typeof Deno !== 'undefined' && Deno.env) {
  serve(handler);
}
