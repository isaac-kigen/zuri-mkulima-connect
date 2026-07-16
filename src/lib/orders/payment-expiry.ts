import { createNotification } from "@/lib/auth/roles";

export const PAYMENT_WINDOW_HOURS = 24;
export const MAX_FAILED_PAYMENT_ATTEMPTS = 3;

export async function expireAcceptedOrderIfNeeded(
  supabase: any,
  order: {
    id: string;
    status?: string | null;
    accepted_at?: string | null;
    payment_deadline_at?: string | null;
    buyer_id?: string | null;
  }
) {
  if (!order?.id || order.status !== "accepted") {
    return { expired: false, cancelled: false, order };
  }

  const now = Date.now();
  let deadline = order.payment_deadline_at ? new Date(order.payment_deadline_at).getTime() : null;

  if (!deadline) {
    const acceptedAt = order.accepted_at ? new Date(order.accepted_at).getTime() : Date.now();
    deadline = acceptedAt + PAYMENT_WINDOW_HOURS * 60 * 60 * 1000;

    const { data: updatedOrder, error } = await supabase
      .from("orders")
      .update({ payment_deadline_at: new Date(deadline).toISOString() })
      .eq("id", order.id)
      .select("id,status,accepted_at,payment_deadline_at,buyer_id")
      .single();

    if (error) throw error;
    return {
      expired: false,
      cancelled: false,
      order: updatedOrder ? { ...order, ...updatedOrder } : { ...order, payment_deadline_at: new Date(deadline).toISOString() },
    };
  }

  if (deadline <= now) {
    const cancelledAt = new Date().toISOString();
    const { data: updatedOrder, error } = await supabase
      .from("orders")
      .update({
        status: "cancelled",
        cancelled_at: cancelledAt,
        cancellation_reason: "Payment window expired after 24 hours without payment",
      })
      .eq("id", order.id)
      .select("id,status,accepted_at,payment_deadline_at,buyer_id")
      .single();

    if (error) throw error;

    if (order.buyer_id) {
      await createNotification(
        supabase,
        order.buyer_id,
        "Payment Window Expired",
        "Your order was cancelled because payment was not completed within 24 hours.",
        "payment_expired",
        order.id
      );
    }

    return { expired: true, cancelled: true, order: updatedOrder || { ...order, status: "cancelled" } };
  }

  return { expired: false, cancelled: false, order };
}

export async function applyFailedPaymentAttempt(supabase: any, orderId: string) {
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id,status,payment_failed_count")
    .eq("id", orderId)
    .single();

  if (orderError || !order) {
    throw new Error("Order not found");
  }

  const failedCount = (order.payment_failed_count || 0) + 1;
  const shouldCancel = failedCount >= MAX_FAILED_PAYMENT_ATTEMPTS;

  const updatePayload: Record<string, any> = {
    payment_failed_count: failedCount,
  };

  if (shouldCancel) {
    updatePayload.status = "cancelled";
    updatePayload.cancelled_at = new Date().toISOString();
    updatePayload.cancellation_reason = "Payment failed after 3 attempts";
  }

  const { data: updatedOrder, error } = await supabase
    .from("orders")
    .update(updatePayload)
    .eq("id", orderId)
    .select("id,status,payment_failed_count")
    .single();

  if (error) throw error;

  return {
    failedCount,
    cancelled: shouldCancel,
    order: updatedOrder,
  };
}
