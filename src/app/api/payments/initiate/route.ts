import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireRole, createNotification } from "@/lib/auth/roles";
import { initiateStkPush } from "@/lib/mpesa/daraja";
import { checkRateLimit, RateLimits } from "@/lib/utils/rate-limit";
import { applyFailedPaymentAttempt, expireAcceptedOrderIfNeeded } from "@/lib/orders/payment-expiry";

export async function POST(request: NextRequest) {
  try {
    const { profile } = await requireRole("buyer");
    const supabase = await createClient();

    // Rate limit payment initiation
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    const rl = checkRateLimit(`payment:${profile.id}`, RateLimits.PAYMENT.max, RateLimits.PAYMENT.window);
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many payment attempts. Try again later." },
        { status: 429 }
      );
    }

    const { order_id, phone_number } = await request.json();
    if (!order_id || !phone_number) {
      return NextResponse.json(
        { success: false, error: "order_id and phone_number required" },
        { status: 400 }
      );
    }

    // Get order
    let { data: order } = await supabase
      .from("orders")
      .select("*, listing:listings(title)")
      .eq("id", order_id)
      .single();

    if (!order) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }
    if (order.buyer_id !== profile.id) {
      return NextResponse.json({ success: false, error: "Not your order" }, { status: 403 });
    }

    const expiryState = await expireAcceptedOrderIfNeeded(supabase, order);
    if (expiryState.cancelled || expiryState.expired) {
      return NextResponse.json(
        { success: false, error: "This order can no longer be paid because the payment window has expired." },
        { status: 400 }
      );
    }
    order = expiryState.order;

    if (order.status !== "accepted") {
      return NextResponse.json(
        { success: false, error: "Order must be accepted before payment" },
        { status: 400 }
      );
    }

    // Check for existing successful payment
    const { data: existingPayment } = await supabase
      .from("payments")
      .select("*")
      .eq("order_id", order_id)
      .eq("status", "completed")
      .maybeSingle();

    if (existingPayment) {
      return NextResponse.json(
        { success: false, error: "Payment already completed for this order" },
        { status: 400 }
      );
    }

    // M-Pesa limits: AccountReference max 12 chars, TransactionDesc max 13 chars
    const orderRef = order_id.replace(/-/g, "").slice(0, 12);
    const productTitle = order.listing?.title || "Order";
    const txnDesc = productTitle.slice(0, 10) + "...";

    try {
      const mpesaResponse = await initiateStkPush({
        phoneNumber: phone_number,
        amount: order.total_amount_kes,
        accountReference: orderRef,
        transactionDesc: txnDesc,
      });

      // Save payment record (include platform fee from order)
      const { data: payment, error: paymentError } = await supabase
        .from("payments")
        .insert({
          order_id,
          payer_id: profile.id,
          amount_kes: order.total_amount_kes,
          platform_fee_kes: order.platform_fee_kes || 0,
          phone_number,
          merchant_request_id: mpesaResponse.MerchantRequestID,
          checkout_request_id: mpesaResponse.CheckoutRequestID,
          status: "pending",
          daraja_response: mpesaResponse,
        })
        .select()
        .single();

      if (paymentError) {
        return NextResponse.json(
          { success: false, error: paymentError.message },
          { status: 400 }
        );
      }

      await createNotification(
        supabase,
        profile.id,
        "Payment Initiated",
        `M-Pesa payment of KES ${order.total_amount_kes.toLocaleString()} initiated. Check your phone for the STK push prompt.`,
        "payment_initiated",
        payment.id
      );

      return NextResponse.json({
        success: true,
        data: {
          payment,
          mpesa_response: mpesaResponse,
        },
      });
    } catch (mpesaError: any) {
      console.error("[M-Pesa Initiate] Error:", mpesaError.message);
      await applyFailedPaymentAttempt(supabase, order_id);
      return NextResponse.json(
        {
          success: false,
          error: `M-Pesa payment initiation failed: ${mpesaError.message}`,
        },
        { status: 502 }
      );
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { profile } = await requireRole("admin");
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("payments")
      .select("*, payer:profiles!payments_payer_id_fkey(id, full_name)")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
