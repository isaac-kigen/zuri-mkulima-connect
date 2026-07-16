import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireRole, createNotification } from "@/lib/auth/roles";
import { queryStkStatus } from "@/lib/mpesa/daraja";
import { applyFailedPaymentAttempt } from "@/lib/orders/payment-expiry";

/**
 * POST /api/payments/query
 *
 * Polls M-Pesa for the status of an STK Push payment.
 * Used as a fallback when the callback doesn't arrive (e.g. in local dev).
 *
 * Body: { payment_id: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { profile } = await requireRole("buyer", "admin");
    const supabase = await createClient();

    const { payment_id } = await request.json();
    if (!payment_id) {
      return NextResponse.json(
        { success: false, error: "payment_id required" },
        { status: 400 }
      );
    }

    // Get payment record
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .select("*")
      .eq("id", payment_id)
      .single();

    if (paymentError || !payment) {
      return NextResponse.json(
        { success: false, error: "Payment not found" },
        { status: 404 }
      );
    }

    // Only buyers can query their own payments; admins can query any
    if (profile.role === "buyer" && payment.payer_id !== profile.id) {
      return NextResponse.json(
        { success: false, error: "Not your payment" },
        { status: 403 }
      );
    }

    // If already completed or failed, return current status
    if (payment.status === "completed" || payment.status === "failed") {
      return NextResponse.json({
        success: true,
        data: {
          status: payment.status,
          mpesa_receipt_number: payment.mpesa_receipt_number,
          message: payment.status === "completed" ? "Payment already confirmed" : "Payment previously failed",
        },
      });
    }

    // Need CheckoutRequestID to query M-Pesa
    if (!payment.checkout_request_id) {
      return NextResponse.json({
        success: true,
        data: {
          status: payment.status,
          message: "Payment still pending — no checkout ID available for query",
        },
      });
    }

    const serviceSupabase = createServiceClient();

    // Query M-Pesa
    console.log(`[M-Pesa Query] Checking status for payment ${payment_id}, checkout: ${payment.checkout_request_id}`);

    try {
      const queryResult = await queryStkStatus(payment.checkout_request_id);
      console.log("[M-Pesa Query] Result:", JSON.stringify(queryResult));

      const resultCode = String(queryResult.ResultCode || "");

      if (resultCode === "0") {
        // Payment completed — update records
        const now = new Date().toISOString();

        await serviceSupabase
          .from("payments")
          .update({
            status: "completed",
            mpesa_receipt_number: queryResult.MpesaReceiptNumber || null,
            callback_received_at: now,
            daraja_response: {
              ...(payment.daraja_response ?? {}),
              query_result: queryResult,
              synced_via: "query_polling",
            },
          })
          .eq("id", payment.id);

        const { data: orderInfo } = await serviceSupabase
          .from("orders")
          .select("status")
          .eq("id", payment.order_id)
          .single();

        if (orderInfo?.status === "accepted") {
          await serviceSupabase
            .from("orders")
            .update({
              status: "paid",
              paid_at: now,
              payment_failed_count: 0,
            })
            .eq("id", payment.order_id);
        } else {
          console.warn(`[M-Pesa Query] Order ${payment.order_id} not in accepted state; skipping paid transition. Current status: ${orderInfo?.status}`);
        }

        // Notify buyer
        await createNotification(
          supabase,
          payment.payer_id,
          "Payment Received — Awaiting Delivery",
          `Your payment of KES ${payment.amount_kes.toLocaleString()} has been received and is securely held. ` +
            `Receipt: ${queryResult.MpesaReceiptNumber || "N/A"}`,
          "payment_held",
          payment.id
        );

        // Notify farmer
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

        return NextResponse.json({
          success: true,
          data: {
            status: "completed",
            mpesa_receipt_number: queryResult.MpesaReceiptNumber || null,
            message: "Payment confirmed via M-Pesa",
          },
        });
      } else if (resultCode === "1037" || resultCode === "1032") {
        // 1037: Transaction timed out / cancelled by user
        // 1032: Transaction cancelled by user
        if (payment.status !== "failed") {
          await serviceSupabase
            .from("payments")
            .update({
              status: "failed",
              callback_received_at: new Date().toISOString(),
              daraja_response: {
                ...(payment.daraja_response ?? {}),
                query_result: queryResult,
                synced_via: "query_polling",
              },
            })
            .eq("id", payment.id);

          const failureState = await applyFailedPaymentAttempt(serviceSupabase, payment.order_id);

          if (failureState.cancelled) {
            await createNotification(
              supabase,
              payment.payer_id,
              "Order Cancelled After Failed Payments",
              "Your order was cancelled after " +
                failureState.failedCount +
                " failed payment attempts. Please place a new order if you still want to buy this product.",
              "order_cancelled_payment_failed",
              payment.order_id
            );
          } else {
            await createNotification(
              supabase,
              payment.payer_id,
              "Payment Failed",
              "Your payment was not completed: " +
                (queryResult.ResultDesc || "Cancelled or timed out") +
                ". You can retry from your orders page.",
              "payment_failed",
              payment.id
            );
          }
        }

        return NextResponse.json({
          success: true,
          data: {
            status: "failed",
            message: payment.status === "failed"
              ? "Payment previously failed"
              : queryResult.ResultDesc || "Payment was not completed",
          },
        });
      } else {
        // Still pending or unknown — don't change status
        return NextResponse.json({
          success: true,
          data: {
            status: "pending",
            message: queryResult.ResultDesc || "Payment still processing",
            result_code: resultCode,
          },
        });
      }
    } catch (queryError: any) {
      console.error("[M-Pesa Query] Error querying M-Pesa:", queryError.message);

      // If the payment already transitioned to failed/completed via callback,
      // return the updated status instead of leaving the UI waiting forever.
      const { data: freshPayment } = await supabase
        .from("payments")
        .select("status, mpesa_receipt_number")
        .eq("id", payment.id)
        .single();

      if (freshPayment?.status === "completed" || freshPayment?.status === "failed") {
        return NextResponse.json({
          success: true,
          data: {
            status: freshPayment.status,
            mpesa_receipt_number: freshPayment.mpesa_receipt_number,
            message: freshPayment.status === "completed"
              ? "Payment already confirmed"
              : "Payment previously failed",
          },
        });
      }

      return NextResponse.json({
        success: true,
        data: {
          status: payment.status,
          message: "Could not query M-Pesa at this moment. Please try again.",
          query_error: queryError.message,
        },
      });
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
