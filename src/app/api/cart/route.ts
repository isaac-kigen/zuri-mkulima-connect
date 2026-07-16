import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/roles";

export async function GET() {
  try {
    const { profile } = await requireRole("buyer");
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("cart_items")
      .select("*, listing:listings(*, farmer:profiles!listings_farmer_id_fkey(id, full_name, county))")
      .eq("buyer_id", profile.id)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { profile } = await requireRole("buyer");
    const supabase = await createClient();

    const { listing_id, quantity } = await request.json();
    if (!listing_id) {
      return NextResponse.json({ success: false, error: "listing_id required" }, { status: 400 });
    }

    // Check listing exists and is active
    const { data: listing } = await supabase
      .from("listings")
      .select("id, status, quantity_available, unit, title")
      .eq("id", listing_id)
      .single();
    if (!listing || listing.status !== "active") {
      return NextResponse.json({ success: false, error: "Listing not available" }, { status: 400 });
    }

    const qty = Number(quantity) || 1;
    if (qty <= 0) {
      return NextResponse.json({ success: false, error: "Quantity must be at least 1" }, { status: 400 });
    }

    const { data: existingCartItem } = await supabase
      .from("cart_items")
      .select("id, quantity")
      .eq("buyer_id", profile.id)
      .eq("listing_id", listing_id)
      .maybeSingle();

    const requestedQuantity = existingCartItem ? existingCartItem.quantity + qty : qty;
    if (requestedQuantity > listing.quantity_available) {
      return NextResponse.json({
        success: false,
        error: `Only ${listing.quantity_available} ${listing.unit} available for ${listing.title}.`,
      }, { status: 400 });
    }

    // Upsert - update quantity if already in cart
    const { data, error } = await supabase
      .from("cart_items")
      .upsert({
        buyer_id: profile.id,
        listing_id,
        quantity: requestedQuantity,
      }, { onConflict: "buyer_id,listing_id" })
      .select("*, listing:listings(*)")
      .single();

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 });

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
