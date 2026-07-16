import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireRole, writeAuditLog, createNotification } from "@/lib/auth/roles";

/**
 * POST /api/orders/[id]/complete
 * 
 * ⚠️ DEPRECATED for normal flow — use /deliver (farmer) and /receive (buyer) instead.
 * 
 * Now only works for:
 *  - Admin force-complete (any order)
 *  - Legacy orders that were in "accepted" status before escrow system
 * 
 * Normal escrow flow: paid → farmer delivers → buyer receives → auto-completed
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{  id: string  }> }) {
  try {
    const { profile } = await requireRole("buyer", "admin");
    const supabase = await createClient();
    const { id } = await params;

    const { data: order } = await supabase
      .from("orders")
      .select("*, listing:listings(id, title, farmer_id)")
      .eq("id", id)
      .single();

    if (!order) return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });

    // Admin can complete any order
    if (profile.role === "admin") {
      const now = new Date().toISOString();
      await supabase.from("orders").update({
        status: "completed",
        completed_at: now,
        delivered_at: order.delivered_at || now,
        received_at: order.received_at || now,
      }).eq("id", id);

      await createNotification(supabase, order.buyer_id, "Order Completed by Admin", `Order #${id.slice(0, 8)} has been completed by an admin.`, "order_completed", id);
      await createNotification(supabase, order.farmer_id, "Order Completed by Admin", `Order #${id.slice(0, 8)} has been completed by an admin. Funds released: KES ${order.farmer_earnings_kes?.toLocaleString() || '0'}`, "funds_released", id);
      await writeAuditLog(supabase, profile.id, "admin_force_complete", "order", id);

      return NextResponse.json({ success: true, data: { message: "Order force-completed by admin" } });
    }

    // For buyers: only allow completing legacy "accepted" orders (pre-escrow)
    if (order.status === "accepted") {
      if (order.buyer_id !== profile.id) {
        return NextResponse.json({ success: false, error: "Not your order" }, { status: 403 });
      }

      const now = new Date().toISOString();
      await supabase.from("orders").update({
        status: "completed",
        completed_at: now,
        delivered_at: now,
        received_at: now,
      }).eq("id", id);

      await createNotification(supabase, order.farmer_id, "Order Completed", `Order #${id.slice(0, 8)} completed. KES ${order.farmer_earnings_kes?.toLocaleString() || '0'} earned.`, "order_completed", id);
      await createNotification(supabase, order.buyer_id, "Order Complete — Rate Now ⭐", "Your order is complete. Please rate the farmer and listing!", "rate_reminder", id);
      await writeAuditLog(supabase, profile.id, "complete_order_legacy", "order", id);

      return NextResponse.json({ success: true, data: { message: "Legacy order completed" } });
    }

    // For "paid" orders: must use /deliver and /receive endpoints
    if (order.status === "paid") {
      return NextResponse.json({
        success: false,
        error: "This order is in escrow. The farmer must confirm delivery via /deliver and you must confirm receipt via /receive.",
        code: "USE_ESCROW_FLOW",
        hint: {
          farmer_action: `POST /api/orders/${id}/deliver`,
          buyer_action: `POST /api/orders/${id}/receive`,
        },
      }, { status: 400 });
    }

    return NextResponse.json(
      { success: false, error: `Cannot complete order in status: ${order.status}` },
      { status: 400 }
    );
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
