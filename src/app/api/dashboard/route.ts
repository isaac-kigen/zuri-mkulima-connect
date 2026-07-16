import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/roles";

export async function GET() {
  try {
    const { profile } = await requireAuth();
    const supabase = await createClient();
    const snapshot: any = {
      role: profile.role,
      unread_notifications: 0,
    };

    // Unread notifications count
    const { count: unreadCount } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", profile.id)
      .eq("is_read", false);
    snapshot.unread_notifications = unreadCount || 0;

    if (profile.role === "farmer") {
      const { count: activeListings } = await supabase.from("listings").select("*", { count: "exact", head: true }).eq("farmer_id", profile.id).eq("status", "active");
      const { count: pendingOrders } = await supabase.from("orders").select("*", { count: "exact", head: true }).eq("farmer_id", profile.id).eq("status", "pending");
      const { count: completedOrders } = await supabase.from("orders").select("*", { count: "exact", head: true }).eq("farmer_id", profile.id).eq("status", "completed");
      const { data: revenue } = await supabase.from("orders").select("total_amount_kes").eq("farmer_id", profile.id).eq("status", "completed");

      snapshot.active_listings = activeListings || 0;
      snapshot.pending_orders = pendingOrders || 0;
      snapshot.completed_orders = completedOrders || 0;
      snapshot.total_revenue = revenue?.reduce((sum, o) => sum + o.total_amount_kes, 0) || 0;
    } else if (profile.role === "buyer") {
      const { count: pendingOrders } = await supabase.from("orders").select("*", { count: "exact", head: true }).eq("buyer_id", profile.id).in("status", ["pending", "accepted"]);
      const { count: completedOrders } = await supabase.from("orders").select("*", { count: "exact", head: true }).eq("buyer_id", profile.id).eq("status", "completed");

      snapshot.pending_orders = pendingOrders || 0;
      snapshot.completed_orders = completedOrders || 0;
    } else if (profile.role === "admin") {
      const { count: totalUsers } = await supabase.from("profiles").select("*", { count: "exact", head: true });
      const { count: totalListings } = await supabase.from("listings").select("*", { count: "exact", head: true });
      const { count: totalOrders } = await supabase.from("orders").select("*", { count: "exact", head: true });
      const { count: pendingOrders } = await supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", "pending");
      const { data: revenue } = await supabase.from("orders").select("total_amount_kes").eq("status", "completed");
      const { count: openComplaints } = await supabase.from("complaints").select("*", { count: "exact", head: true }).eq("status", "open");

      snapshot.total_users = totalUsers || 0;
      snapshot.total_listings = totalListings || 0;
      snapshot.total_orders = totalOrders || 0;
      snapshot.pending_orders = pendingOrders || 0;
      snapshot.total_revenue_platform = revenue?.reduce((sum, o) => sum + o.total_amount_kes, 0) || 0;
      snapshot.open_complaints = openComplaints || 0;
    }

    return NextResponse.json({ success: true, data: snapshot });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
