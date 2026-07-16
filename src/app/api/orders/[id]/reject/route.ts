import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireRole, writeAuditLog, createNotification } from "@/lib/auth/roles";

/**
 * POST /api/orders/[id]/reject
 * Reject an order. Farmer or admin.
 * 
 * - pending → rejected normally
 * - paid (escrow) → rejected + refund notification (funds returned to buyer)
 * - accepted/delivered/received → cannot reject (cancel instead)
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{  id: string  }> }) {
  try {
    const { profile } = await requireRole("farmer", "admin");
    const supabase = await createClient();
    const { id } = await params;

    const { data: order } = await supabase
      .from("orders")
      .select("*, listing:listings(id, title, quantity_available)")
      .eq("id", id)
      .single();

    if (!order) return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });

    // Only pending or paid orders can be rejected
    const rejectableStatuses = ["pending", "paid"];
    if (!rejectableStatuses.includes(order.status)) {
      return NextResponse.json(
        { success: false, error: `Order cannot be rejected in status: ${order.status}. Use cancel instead.` },
        { status: 400 }
      );
    }

    if (profile.role !== "admin" && order.farmer_id !== profile.id) {
      return NextResponse.json({ success: false, error: "Not your order" }, { status: 403 });
    }

    const { reason } = await request.json();
    const now = new Date().toISOString();
    const rejectReason = reason || "Order rejected by seller";

    // If order was paid, funds were in escrow — return to buyer
    const wasPaid = order.status === "paid";

    const { error } = await supabase.from("orders").update({
      status: "rejected",
      rejection_reason: rejectReason,
      rejected_at: now,
    }).eq("id", id);

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 });

    // Restore inventory
    if (order.listing) {
      const newQty = (order.listing.quantity_available || 0) + order.quantity;
      await supabase
        .from("listings")
        .update({ quantity_available: newQty, status: "active" })
        .eq("id", order.listing_id);
    }

    const refundNote = wasPaid
      ? ` KES ${order.total_amount_kes?.toLocaleString()} held in escrow will be returned to the buyer.`
      : "";

    await createNotification(
      supabase,
      order.buyer_id,
      "Order Rejected by Seller",
      `Your order #${id.slice(0, 8)} for "${order.listing?.title || 'product'}" was rejected: ${rejectReason}.${refundNote}`,
      "order_rejected",
      id
    );

    await createNotification(
      supabase,
      order.farmer_id,
      "Order Rejected",
      `You rejected order #${id.slice(0, 8)}.${wasPaid ? " Funds will be returned to the buyer." : ""}`,
      "order_rejected",
      id
    );

    await writeAuditLog(supabase, profile.id, "reject_order", "order", id, {
      reason: rejectReason,
      was_paid: wasPaid,
      inventory_restored: true,
    });

    return NextResponse.json({
      success: true,
      data: {
        message: wasPaid
          ? "Order rejected. Funds held in escrow will be returned to the buyer."
          : "Order rejected.",
        refund_expected: wasPaid,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
