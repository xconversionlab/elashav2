import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
        JSON.stringify({ error: 'Supabase environment configuration missing.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!razorpayKeyId || !razorpayKeySecret) {
      return new Response(
        JSON.stringify({
          error: 'Payment gateway is currently unavailable because Razorpay merchant credentials are not configured.',
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

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized user session.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Trigger cleanup of any expired reservations before processing new checkout
    try {
      await supabaseClient.rpc('cleanup_expired_stock_reservations');
    } catch (e) {
      console.warn('Cleanup expired reservations RPC warning:', e);
    }

    const body = await req.json();
    const { items, shipping_address, customer_notes } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Cart is empty or invalid.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: shippingSetting, error: shippingSettingError } = await supabaseClient
      .from('admin_settings')
      .select('value')
      .eq('key', 'shipping_fee_inr')
      .maybeSingle();
    const rawShippingFee = shippingSetting?.value;
    const shippingFee = rawShippingFee === null || rawShippingFee === undefined || String(rawShippingFee).trim() === ''
      ? Number.NaN
      : Number(rawShippingFee);
    if (shippingSettingError || !Number.isFinite(shippingFee) || shippingFee < 0) {
      throw new Error('SHIPPING_FEE_NOT_CONFIGURED: Store checkout is unavailable until a valid shipping fee is configured.');
    }

    let calculatedTotal = 0;
    const validatedOrderItems = [];
    const reservedVariants: { variant_id: string; quantity: number }[] = [];

    try {
      for (const item of items) {
        if (item.custom_design_id) {
          const { data: design, error: designError } = await supabaseClient
            .from('custom_designs')
            .select('id, user_id, price, garment_name, colour_name, size_label')
            .eq('id', item.custom_design_id)
            .single();

          if (designError || !design) {
            throw new Error('Custom design artwork record not found.');
          }
          if (design.user_id !== user.id) {
            throw new Error('Access denied to private custom design.');
          }

          const unitPrice = Number(design.price);
          const qty = Math.max(1, Math.floor(Number(item.quantity) || 1));
          calculatedTotal += unitPrice * qty;

          validatedOrderItems.push({
            product_id: null,
            variant_id: null,
            custom_design_id: design.id,
            product_name: design.garment_name || 'Custom T-Shirt',
            size_label: design.size_label,
            colour_name: design.colour_name,
            quantity: qty,
            unit_price: unitPrice,
          });
        } else if (item.variant_id) {
          const qty = Math.max(1, Math.floor(Number(item.quantity) || 1));

          // Fetch variant details
          const { data: variant, error: variantError } = await supabaseClient
            .from('product_variants')
            .select('id, product_id, stock, price_override, product:products(name, price), size:sizes(label), colour:colours(name)')
            .eq('id', item.variant_id)
            .single();

          if (variantError || !variant) {
            throw new Error('Product variant not found in catalogue.');
          }

          // Atomic reservation via PostgreSQL RPC function
          const { data: reserved, error: rpcError } = await supabaseClient.rpc('reserve_variant_stock', {
            p_variant_id: item.variant_id,
            p_quantity: qty,
          });

          if (rpcError || !reserved) {
            throw new Error(`Insufficient stock for ${(variant.product as { name?: string })?.name ?? 'product'}.`);
          }

          reservedVariants.push({ variant_id: item.variant_id, quantity: qty });

          const unitPrice = variant.price_override ?? (variant.product as { price?: number })?.price ?? 0;
          calculatedTotal += unitPrice * qty;

          validatedOrderItems.push({
            product_id: variant.product_id,
            variant_id: variant.id,
            custom_design_id: null,
            product_name: (variant.product as { name?: string })?.name ?? 'Piece',
            size_label: (variant.size as { label?: string })?.label ?? null,
            colour_name: (variant.colour as { name?: string })?.name ?? null,
            quantity: qty,
            unit_price: unitPrice,
          });
        }
      }

      const itemsSubtotal = calculatedTotal;
      const orderTotal = itemsSubtotal + shippingFee;
      const orderNumber = 'EL' + Date.now().toString().slice(-8);
      const amountInPaise = Math.round(orderTotal * 100);

      // Call Razorpay API to create order
      const razorpayRes = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(`${razorpayKeyId}:${razorpayKeySecret}`),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amountInPaise,
          currency: 'INR',
          receipt: orderNumber,
          notes: { user_id: user.id, order_number: orderNumber },
        }),
      });

      if (!razorpayRes.ok) {
        const errorText = await razorpayRes.text();
        throw new Error('Razorpay order creation failed: ' + errorText);
      }

      const rzpData = await razorpayRes.json();
      const razorpayOrderId = rzpData.id;
      const reservationExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

      const { data: newOrder, error: orderInsertError } = await supabaseClient
        .from('orders')
        .insert({
          user_id: user.id,
          order_number: orderNumber,
          status: 'pending',
          payment_status: 'pending',
          total: orderTotal,
          shipping_amount: shippingFee,
          shipping_address,
          customer_notes: customer_notes || null,
          razorpay_order_id: razorpayOrderId,
          stock_reserved: true,
          reservation_expires_at: reservationExpiresAt,
        })
        .select('id')
        .single();

      if (orderInsertError || !newOrder) {
        throw new Error('Failed to record order: ' + orderInsertError?.message);
      }

      const itemsToInsert = validatedOrderItems.map(item => ({
        order_id: newOrder.id,
        ...item,
      }));

      const { error: itemsInsertError } = await supabaseClient
        .from('order_items')
        .insert(itemsToInsert);

      if (itemsInsertError) {
        await supabaseClient.from('orders').delete().eq('id', newOrder.id);
        throw new Error('Failed to record order items: ' + itemsInsertError.message);
      }

      return new Response(
        JSON.stringify({
          key_id: razorpayKeyId,
          razorpay_order_id: razorpayOrderId,
          internal_order_id: newOrder.id,
          order_number: orderNumber,
          amount: amountInPaise,
          total: orderTotal,
          items_subtotal: itemsSubtotal,
          shipping_fee: shippingFee,
          currency: 'INR',
          reservation_expires_at: reservationExpiresAt,
          prefill: {
            name: shipping_address?.name || '',
            email: shipping_address?.email || user.email || '',
            contact: shipping_address?.phone || '',
          },
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (err) {
      // Rollback reserved stock using atomic release_variant_stock
      for (const res of reservedVariants) {
        try {
          await supabaseClient.rpc('release_variant_stock', {
            p_variant_id: res.variant_id,
            p_quantity: res.quantity,
          });
        } catch (e) {
          console.error('Error rolling back stock:', e);
        }
      }
      throw err;
    }
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Checkout order creation failed.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

if (typeof Deno !== 'undefined' && Deno.env) {
  serve(handler);
}
