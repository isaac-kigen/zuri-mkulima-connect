import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireRole, writeAuditLog, createNotification } from "@/lib/auth/roles";

/**
 * POST /api/orders/[id]/cancel
 * Cancel an order. Buyer or admin.
 * 
 * - pending/accepted → cancelled normally
 * - paid (escrow) → cancelled + refund notification (funds held are returned to buyer)
 * - delivered/received → cannot cancel (dispute via complaints)
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{  id: string  }> }) {
  try {
    const { profile } = await requireRole("buyer", "admin");
    const supabase = await createClient();
    const { id } = await params;

    const { data: order } = await supabase
      .from("orders")
      .select("*, listing:listings(id, title, quantity_available)")
      .eq("id", id)
      .single();

    if (!order) return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });

    const serviceSupabase = createServiceClient();
    let listingRecord = order.listing;
    if (!listingRecord && order.listing_id) {
      const { data: listingLookup } = await serviceSupabase
        .from("listings")
        .select("id, title, quantity_available")
        .eq("id", order.listing_id)
        .single();
      listingRecord = listingLookup || undefined;
    }

    const cancellableStatuses = ["pending", "accepted", "paid"];
    if (!cancellableStatuses.includes(order.status)) {
      return NextResponse.json(
        { success: false, error: `Order cannot be cancelled in status: ${order.status}` },
        { status: 400 }
      );
    }

    // Only the buyer or admin can cancel
    if (profile.role !== "admin" && order.buyer_id !== profile.id) {
      return NextResponse.json({ success: false, error: "Not your order" }, { status: 403 });
    }

    const { reason } = await request.json();
    const now = new Date().toISOString();
    const cancelReason = reason || "Cancelled by buyer";

    // If order was paid, the funds were held in escrow — they will be returned to buyer
    const wasPaid = order.status === "paid";

    const { error } = await serviceSupabase.from("orders").update({
      status: "cancelled",
      cancellation_reason: cancelReason,
      cancelled_at: now,
    }).eq("id", id);

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 });

    if (listingRecord) {
      const newQty = (listingRecord.quantity_available || 0) + order.quantity;
      await serviceSupabase
        .from("listings")
        .update({ quantity_available: newQty, status: "active" })
        .eq("id", order.listing_id);
    }

    // Notifications
    const refundNote = wasPaid
      ? " The funds held in escrow (KES " + order.total_amount_kes?.toLocaleString() + ") will be returned to you."
      : "";

    await createNotification(
      supabase,
      order.buyer_id,
      "Order Cancelled",
      `You cancelled order #${id.slice(0, 8)} for "${order.listing?.title || 'product'}".${refundNote}`,
      "order_cancelled",
      id
    );

    await createNotification(
      supabase,
      order.farmer_id,
      "Order Cancelled by Buyer",
      `Order #${id.slice(0, 8)} for "${order.listing?.title || 'product'}" was cancelled by the buyer. Reason: ${cancelReason}${wasPaid ? " Funds will be returned to the buyer." : ""}`,
      "order_cancelled",
      id
    );

    await writeAuditLog(supabase, profile.id, "cancel_order", "order", id, {
      reason: cancelReason,
      was_paid: wasPaid,
      inventory_restored: true,
    });

    return NextResponse.json({
      success: true,
      data: {
        message: wasPaid
          ? "Order cancelled. Funds held in escrow will be returned to you."
          : "Order cancelled.",
        refund_expected: wasPaid,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
