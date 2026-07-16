import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createNotification } from "@/lib/auth/roles";
import { applyFailedPaymentAttempt } from "@/lib/orders/payment-expiry";

/**
 * M-Pesa Daraja STK Push callback endpoint.
 *
 * Called asynchronously by Safaricom when an STK Push payment completes.
 * Must always respond with HTTP 200 + { ResultCode: 0, ResultDesc: "..." }
 * even on error, otherwise M-Pesa will retry indefinitely.
 *
 * IMPORTANT (Escrow): Payment is HELD in the platform. The order is set to "paid"
 * (not "completed"). Funds are only released to the farmer after BOTH:
 *   1. Farmer confirms delivery (POST /api/orders/[id]/deliver)
 *   2. Buyer confirms receipt  (POST /api/orders/[id]/receive)
 *
 * @see https://developer.safaricom.co.ke/docs/mpesa-express
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    console.log("[M-Pesa Callback] Received:", JSON.stringify(body));

    const supabase = createServiceClient();

    // ── 1. Validate callback structure ────────────────────────────
    const stkCallback = body?.Body?.stkCallback;
    if (!stkCallback) {
      console.error("[M-Pesa Callback] Missing Body.stkCallback");
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Invalid callback structure" });
    }

    const {
      MerchantRequestID,
      CheckoutRequestID,
      ResultCode,
      ResultDesc,
      CallbackMetadata,
    } = stkCallback;

    if (!CheckoutRequestID && !MerchantRequestID) {
      console.error("[M-Pesa Callback] Missing both CheckoutRequestID and MerchantRequestID");
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Missing transaction identifiers" });
    }

    // ── 2. Find the payment record ────────────────────────────────
    let { data: payment } = await supabase
      .from("payments")
      .select("*")
      .eq("checkout_request_id", CheckoutRequestID || "")
      .maybeSingle();

    if (!payment && MerchantRequestID) {
      const { data: fallback } = await supabase
        .from("payments")
        .select("*")
        .eq("merchant_request_id", MerchantRequestID)
        .maybeSingle();
      payment = fallback;
    }

    if (!payment) {
      console.error(
        "[M-Pesa Callback] Payment not found for CheckoutRequestID:",
        CheckoutRequestID,
        "or MerchantRequestID:",
        MerchantRequestID
      );
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Payment record not found" });
    }

    // ── 3. Idempotency check ─────────────────────────────────────
    if (payment.status === "completed") {
      console.log("[M-Pesa Callback] Payment already completed, skipping. ID:", payment.id);
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Already processed" });
    }

    // ── 4. Process based on ResultCode ────────────────────────────
    const isSuccess = String(ResultCode) === "0";

    if (isSuccess) {
      // ── Successful payment ──────────────────────────────────────
      const metadata = CallbackMetadata?.Item || [];

      const mpesaReceiptNumber =
        metadata.find((item: any) => item.Name === "MpesaReceiptNumber")?.Value || null;

      const callbackAmount =
        metadata.find((item: any) => item.Name === "Amount")?.Value || null;

      const transactionDate =
        metadata.find((item: any) => item.Name === "TransactionDate")?.Value || null;

      const phoneNumber =
        metadata.find((item: any) => item.Name === "PhoneNumber")?.Value || null;

      console.log("[M-Pesa Callback] SUCCESS:", {
        paymentId: payment.id,
        orderId: payment.order_id,
        receipt: mpesaReceiptNumber,
        amount: callbackAmount,
        phone: phoneNumber,
      });

      const now = new Date().toISOString();

      // Mark payment as completed (M-Pesa side)
      await supabase
        .from("payments")
        .update({
          status: "completed",
          mpesa_receipt_number: mpesaReceiptNumber,
          daraja_response: body,
          callback_received_at: now,
        })
        .eq("id", payment.id);

      // ── ESCROW: Set order to "paid" — funds HELD in platform ──
      // Order will only become "completed" after BOTH farmer & buyer confirm
      const { data: order } = await supabase
        .from("orders")
        .select("status")
        .eq("id", payment.order_id)
        .single();

      if (order?.status === "accepted") {
        await supabase
          .from("orders")
          .update({
            status: "paid",
            paid_at: now,
            payment_failed_count: 0,
          })
          .eq("id", payment.order_id);
      } else {
        console.warn(`[M-Pesa Callback] Order ${payment.order_id} not in accepted state; skipping paid transition. Current status: ${order?.status}`);
      }

      // Notify buyer: payment received, wait for farmer to deliver
      await createNotification(
        supabase,
        payment.payer_id,
        "Payment Received — Awaiting Delivery",
        `Your payment of KES ${payment.amount_kes.toLocaleString()} has been received and is securely held. ` +
          `The farmer will confirm delivery soon. Receipt: ${mpesaReceiptNumber || "N/A"}`,
        "payment_held",
        payment.id
      );

      // Notify farmer: payment held, please deliver and confirm
      const { data: orderDetails } = await supabase
        .from("orders")
        .select("farmer_id, quantity, listing_id")
        .eq("id", payment.order_id)
        .single();

      if (orderDetails?.farmer_id) {
        await createNotification(
          supabase,
          orderDetails.farmer_id,
          "Payment Held — Prepare Delivery",
          `Payment of KES ${payment.amount_kes.toLocaleString()} has been received for your order #${payment.order_id.slice(0, 8)}. ` +
            `The funds are held securely. Please deliver the items and confirm delivery. You will be paid after the buyer confirms receipt.`,
          "payment_held_farmer",
          payment.id
        );
      }
    } else {
      // ── Failed / cancelled payment ──────────────────────────────
      console.log("[M-Pesa Callback] FAILED:", {
        paymentId: payment.id,
        resultCode: ResultCode,
        resultDesc: ResultDesc,
      });

      await supabase
        .from("payments")
        .update({
          status: "failed",
          daraja_response: body,
          callback_received_at: new Date().toISOString(),
        })
        .eq("id", payment.id);

      const failureState = await applyFailedPaymentAttempt(supabase, payment.order_id);

      if (failureState.cancelled) {
        await createNotification(
          supabase,
          payment.payer_id,
          "Order Cancelled After Failed Payments",
          `Your order was cancelled after ${failureState.failedCount} failed payment attempts. Please place a new order if you still want to buy this product.`,
          "order_cancelled_payment_failed",
          payment.order_id
        );
      } else {
        await createNotification(
          supabase,
          payment.payer_id,
          "Payment Failed",
          `Your payment of KES ${payment.amount_kes.toLocaleString()} was not completed. ` +
            `Reason: ${ResultDesc || "Unknown error"}. This was attempt ${failureState.failedCount} of 3. You can retry payment from your orders page.`,
          "payment_failed",
          payment.id
        );
      }
    }

    console.log(
      `[M-Pesa Callback] Processed in ${Date.now() - startTime}ms, paymentId: ${payment.id}`
    );

    // ── 5. Always acknowledge to M-Pesa ───────────────────────────
    const response = NextResponse.json({ ResultCode: 0, ResultDesc: "Callback processed successfully" });
    response.headers.set("Access-Control-Allow-Origin", "*");
    response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    return response;
  } catch (err: any) {
    console.error("[M-Pesa Callback] Unhandled error:", err.message || err);
    const response = NextResponse.json({ ResultCode: 0, ResultDesc: "Callback processed" });
    response.headers.set("Access-Control-Allow-Origin", "*");
    response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    return response;
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    },
  });
}
