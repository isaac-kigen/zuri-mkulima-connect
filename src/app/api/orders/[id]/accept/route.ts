import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireRole, writeAuditLog, createNotification } from "@/lib/auth/roles";

// Accept order (farmer/admin)
export async function POST(request: NextRequest, { params }: { params: Promise<{  id: string  }> }) {
  try {
    const { profile } = await requireRole("farmer", "admin");
    const supabase = await createClient();
    const { id } = await params;

    const { data: order } = await supabase.from("orders").select("*").eq("id", id).single();
    if (!order) return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    if (order.status !== "pending") {
      return NextResponse.json({ success: false, error: "Order cannot be accepted in current status" }, { status: 400 });
    }

    const acceptedAt = new Date();
    const paymentDeadlineAt = new Date(acceptedAt.getTime() + 24 * 60 * 60 * 1000).toISOString();

    const { error } = await supabase.from("orders").update({
      status: "accepted",
      accepted_at: acceptedAt.toISOString(),
      payment_deadline_at: paymentDeadlineAt,
    }).eq("id", id);

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 });

    await createNotification(
      supabase,
      order.buyer_id,
      "Order Accepted",
      `Your order #${id.slice(0, 8)} for ${order.quantity} units has been accepted! Total: KES ${order.total_amount_kes.toLocaleString()} (incl. 5% platform fee: KES ${order.platform_fee_kes.toLocaleString()})`,
      "order_accepted",
      id
    );
    await writeAuditLog(supabase, profile.id, "accept_order", "order", id, {
      platform_fee: order.platform_fee_kes,
      farmer_earnings: order.farmer_earnings_kes,
    });

    return NextResponse.json({ success: true, data: { message: "Order accepted" } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
