import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/roles";

export async function GET() {
  try {
    await requireRole("admin");
    const supabase = await createClient();

    // Platform summary
    const { count: totalUsers } = await supabase.from("profiles").select("*", { count: "exact", head: true });
    const { count: totalFarmers } = await supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "farmer");
    const { count: totalBuyers } = await supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "buyer");
    const { count: totalListings } = await supabase.from("listings").select("*", { count: "exact", head: true });
    const { count: activeListings } = await supabase.from("listings").select("*", { count: "exact", head: true }).eq("status", "active");
    const { count: totalOrders } = await supabase.from("orders").select("*", { count: "exact", head: true });
    const { count: completedOrders } = await supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", "completed");
    const { count: pendingOrders } = await supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", "pending");
    const { count: totalComplaints } = await supabase.from("complaints").select("*", { count: "exact", head: true });
    const { count: openComplaints } = await supabase.from("complaints").select("*", { count: "exact", head: true }).eq("status", "open");

    // Revenue
    const { data: completedOrderData } = await supabase.from("orders").select("total_amount_kes").eq("status", "completed");
    const totalRevenue = completedOrderData?.reduce((sum, o) => sum + o.total_amount_kes, 0) || 0;

    // Sales by farmer
    const { data: ordersByFarmer } = await supabase.from("orders").select("farmer_id, total_amount_kes, farmer:profiles!orders_farmer_id_fkey(full_name)").eq("status", "completed");
    const farmerSales: Record<string, { name: string; total: number }> = {};
    for (const o of ordersByFarmer || []) {
      const id = o.farmer_id;
      if (!farmerSales[id]) farmerSales[id] = { name: (o.farmer as any)?.full_name || "Unknown", total: 0 };
      farmerSales[id].total += o.total_amount_kes;
    }

    // Recent payments
    const { data: recentPayments } = await supabase
      .from("payments")
      .select("*, payer:profiles!payments_payer_id_fkey(id, full_name)")
      .order("created_at", { ascending: false })
      .limit(20);

    return NextResponse.json({
      success: true,
      data: {
        total_users: totalUsers || 0,
        farmers: totalFarmers || 0,
        buyers: totalBuyers || 0,
        total_listings: totalListings || 0,
        active_listings: activeListings || 0,
        total_orders: totalOrders || 0,
        completed_orders: completedOrders || 0,
        pending_orders: pendingOrders || 0,
        total_complaints: totalComplaints || 0,
        open_complaints: openComplaints || 0,
        total_revenue: totalRevenue,
        sales_by_farmer: Object.entries(farmerSales).map(([id, v]) => ({ farmer_id: id, farmer_name: v.name, total: v.total })),
        recent_payments: recentPayments || [],
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
