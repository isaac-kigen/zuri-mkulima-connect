import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireRole, writeAuditLog, createNotification } from "@/lib/auth/roles";

/**
 * POST /api/orders/[id]/deliver
 * Farmer confirms they have handed over the goods to the buyer.
 * 
 * Escrow flow:
 * 1. Buyer pays → order = "paid" (funds held)
 * 2. Farmer delivers → sets delivered_at, notifies buyer
 * 3. Buyer receives → sets received_at
 * 4. Both confirmed → order = "completed" (funds released to farmer)
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{  id: string  }> }) {
  try {
    const { profile } = await requireRole("farmer", "admin");
    const supabase = await createClient();
    const { id } = await params;

    const { data: order } = await supabase
      .from("orders")
      .select("*, listing:listings(id, title), buyer:profiles!orders_buyer_id_fkey(id, full_name)")
      .eq("id", id)
      .single();

    if (!order) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }

    // Farmer must own this order (or be admin)
    if (profile.role !== "admin" && order.farmer_id !== profile.id) {
      return NextResponse.json(
        { success: false, error: "This is not your order" },
        { status: 403 }
      );
    }

    // Order must be in "paid" status (payment held in escrow)
    if (order.status !== "paid") {
      return NextResponse.json(
        { success: false, error: `Order must be paid before delivery. Current status: ${order.status}` },
        { status: 400 }
      );
    }

    // Prevent double confirmation
    if (order.delivered_at) {
      return NextResponse.json(
        { success: false, error: "Delivery already confirmed" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    // Update: set delivered_at
    const { error } = await supabase
      .from("orders")
      .update({ delivered_at: now })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    // Check if buyer already confirmed receipt → auto-complete
    if (order.received_at) {
      // Both confirmed! Complete the order and release funds
      await supabase
        .from("orders")
        .update({
          status: "completed",
          completed_at: now,
        })
        .eq("id", id);

      // Notify buyer: order complete
      await createNotification(
        supabase,
        order.buyer_id,
        "Order Complete — Both Confirmed ✅",
        `The farmer has confirmed delivery for "${order.listing?.title || 'product'}". Both parties have now confirmed — the order is complete! You can now rate the farmer.`,
        "order_completed",
        id
      );

      // Notify farmer: funds released
      await createNotification(
        supabase,
        order.farmer_id,
        "Funds Released — Order Complete 🎉",
        `Both you and the buyer have confirmed. Order #${id.slice(0, 8)} is complete! ` +
          `KES ${order.farmer_earnings_kes?.toLocaleString() || '0'} has been released to you (5% platform fee: KES ${order.platform_fee_kes?.toLocaleString() || '0'}).`,
        "funds_released",
        id
      );

      await writeAuditLog(supabase, profile.id, "complete_order_escrow", "order", id, {
        delivered_by: profile.id,
        received_by: order.buyer_id,
        farmer_earnings: order.farmer_earnings_kes,
        platform_fee: order.platform_fee_kes,
        note: "Both parties confirmed — funds released from escrow",
      });

      return NextResponse.json({
        success: true,
        data: {
          message: "Delivery confirmed! Both parties have now confirmed — order is complete and funds are released.",
          order_id: id,
          status: "completed",
          both_confirmed: true,
        },
      });
    }

    // Only farmer confirmed so far — notify buyer to confirm receipt
    await createNotification(
      supabase,
      order.buyer_id,
      "Farmer Has Delivered — Confirm Receipt 📦",
      `The farmer has confirmed delivery of "${order.listing?.title || 'product'}". ` +
        `Please confirm that you've received the items so the farmer can be paid.`,
      "awaiting_receipt",
      id
    );

    await writeAuditLog(supabase, profile.id, "farmer_delivered", "order", id, {
      awaiting: "buyer_receipt_confirmation",
    });

    return NextResponse.json({
      success: true,
      data: {
        message: "Delivery confirmed! Waiting for the buyer to confirm receipt before funds are released.",
        order_id: id,
        status: "paid",
        delivered_at: now,
        awaiting: "buyer_receipt",
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
