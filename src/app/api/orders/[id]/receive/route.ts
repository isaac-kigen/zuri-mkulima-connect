import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireRole, writeAuditLog, createNotification } from "@/lib/auth/roles";

/**
 * POST /api/orders/[id]/receive
 * Buyer confirms they have received the goods from the farmer.
 * 
 * Escrow flow:
 * 1. Buyer pays → order = "paid" (funds held)
 * 2. Farmer delivers → sets delivered_at
 * 3. Buyer receives → sets received_at
 * 4. Both confirmed → order = "completed" (funds released to farmer)
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{  id: string  }> }) {
  try {
    const { profile } = await requireRole("buyer", "admin");
    const supabase = await createClient();
    const { id } = await params;

    const { data: order } = await supabase
      .from("orders")
      .select("*, listing:listings(id, title), farmer:profiles!orders_farmer_id_fkey(id, full_name)")
      .eq("id", id)
      .single();

    if (!order) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }

    // Buyer must own this order (or be admin)
    if (profile.role !== "admin" && order.buyer_id !== profile.id) {
      return NextResponse.json(
        { success: false, error: "This is not your order" },
        { status: 403 }
      );
    }

    // Order must be in "paid" status (payment held in escrow)
    if (order.status !== "paid") {
      return NextResponse.json(
        { success: false, error: `Order must be paid before confirming receipt. Current status: ${order.status}` },
        { status: 400 }
      );
    }

    // Prevent double confirmation
    if (order.received_at) {
      return NextResponse.json(
        { success: false, error: "Receipt already confirmed" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    // Update: set received_at
    const { error } = await supabase
      .from("orders")
      .update({ received_at: now })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    // Check if farmer already confirmed delivery → auto-complete
    if (order.delivered_at) {
      // Both confirmed! Complete the order and release funds
      await supabase
        .from("orders")
        .update({
          status: "completed",
          completed_at: now,
        })
        .eq("id", id);

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

      // Notify buyer: order complete, rate now
      await createNotification(
        supabase,
        order.buyer_id,
        "Order Complete — Rate Your Purchase ⭐",
        `You've confirmed receipt of "${order.listing?.title || 'product'}". The order is now complete ` +
          `and the farmer has been paid. Please rate the farmer and listing!`,
        "order_completed",
        id
      );

      await writeAuditLog(supabase, profile.id, "complete_order_escrow", "order", id, {
        received_by: profile.id,
        delivered_by: order.farmer_id,
        farmer_earnings: order.farmer_earnings_kes,
        platform_fee: order.platform_fee_kes,
        note: "Both parties confirmed — funds released from escrow",
      });

      return NextResponse.json({
        success: true,
        data: {
          message: "Receipt confirmed! Both parties have now confirmed — order is complete and funds are released to the farmer.",
          order_id: id,
          status: "completed",
          both_confirmed: true,
        },
      });
    }

    // Only buyer confirmed so far — notify farmer to deliver
    await createNotification(
      supabase,
      order.farmer_id,
      "Buyer Confirmed Receipt — Please Deliver 📦",
      `The buyer has confirmed they are ready to receive "${order.listing?.title || 'product'}". ` +
        `Please deliver the items and confirm delivery. Payment will be released after your confirmation.`,
      "awaiting_delivery",
      id
    );

    await writeAuditLog(supabase, profile.id, "buyer_received", "order", id, {
      awaiting: "farmer_delivery_confirmation",
    });

    return NextResponse.json({
      success: true,
      data: {
        message: "Receipt confirmed! Waiting for the farmer to confirm delivery before funds are released.",
        order_id: id,
        status: "paid",
        received_at: now,
        awaiting: "farmer_delivery",
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
