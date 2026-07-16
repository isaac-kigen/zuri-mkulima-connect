import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/farmers/[id]/stats
 * Public endpoint — returns brief farmer stats for display on listing cards.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{  id: string  }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;
    const farmerId = id;

    if (!farmerId) {
      return NextResponse.json({ success: false, error: "Farmer ID required" }, { status: 400 });
    }

    // Get brief stats from the RPC function
    const { data: stats, error: statsError } = await supabase.rpc("get_farmer_brief_stats", {
      p_farmer_id: farmerId,
    });

    if (statsError) {
      // Fallback: compute stats manually if RPC not available
      const [ratingsRes, ordersRes, profileRes] = await Promise.all([
        supabase.from("ratings").select("rating").eq("farmer_id", farmerId),
        supabase.from("orders").select("id, completed_at").eq("farmer_id", farmerId).eq("status", "completed"),
        supabase.from("profiles").select("created_at").eq("id", farmerId).single(),
      ]);

      const ratings = ratingsRes.data || [];
      const avgRating = ratings.length > 0
        ? Math.round((ratings.reduce((s, r) => s + r.rating, 0) / ratings.length) * 10) / 10
        : 0;

      return NextResponse.json({
        success: true,
        data: {
          completed_sales: (ordersRes.data || []).length,
          avg_rating: avgRating,
          total_ratings: ratings.length,
          member_since: profileRes.data?.created_at || null,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: stats?.[0] || {
        completed_sales: 0,
        avg_rating: 0,
        total_ratings: 0,
        member_since: null,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
