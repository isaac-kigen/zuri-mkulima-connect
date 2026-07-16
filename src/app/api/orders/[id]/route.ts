import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth, requireRole, writeAuditLog, createNotification } from "@/lib/auth/roles";
import { expireAcceptedOrderIfNeeded } from "@/lib/orders/payment-expiry";

function attachLatestPayment(order: any) {
  if (!order || !Array.isArray(order.payments) || order.payments.length === 0) {
    return order;
  }

  const latestPayment = [...order.payments].sort((a, b) => {
    const aTime = new Date(a.created_at).getTime();
    const bTime = new Date(b.created_at).getTime();
    return bTime - aTime;
  })[0];

  return { ...order, payment: latestPayment };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{  id: string  }> }) {
  try {
    const { profile } = await requireAuth();
    const supabase = await createClient();
    const { id } = await params;

    const { data, error } = await supabase
      .from("orders")
      .select("*, listing:listings(*), buyer:profiles!orders_buyer_id_fkey(id, full_name, phone), farmer:profiles!orders_farmer_id_fkey(id, full_name, phone), payments:payments(*)")
      .eq("id", id)
      .single();

    if (error || !data) return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });

    let orderData = data;
    if (orderData.status === "accepted") {
      const expiryResult = await expireAcceptedOrderIfNeeded(supabase, orderData);
      orderData = expiryResult.order;
    }

    orderData = attachLatestPayment(orderData);

    // Only buyer, farmer, or admin can view
    const isParticipant = orderData.buyer_id === profile.id || orderData.farmer_id === profile.id;
    const isAdmin = profile.role === "admin";
    if (!isParticipant && !isAdmin) {
      return NextResponse.json({ success: false, error: "Insufficient permissions" }, { status: 403 });
    }

    return NextResponse.json({ success: true, data: orderData });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
