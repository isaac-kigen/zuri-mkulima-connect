import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/roles";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{  id: string  }> }) {
  try {
    const { profile } = await requireRole("buyer");
    const supabase = await createClient();
    const { id } = await params;

    const { quantity } = await request.json();
    const qty = Number(quantity) || 1;
    if (qty <= 0) {
      return NextResponse.json({ success: false, error: "Quantity must be at least 1" }, { status: 400 });
    }

    const { data: cartItem } = await supabase
      .from("cart_items")
      .select("id, listing_id")
      .eq("id", id)
      .eq("buyer_id", profile.id)
      .single();

    if (!cartItem) {
      return NextResponse.json({ success: false, error: "Cart item not found" }, { status: 404 });
    }

    const { data: listing, error: listingError } = await supabase
      .from("listings")
      .select("id, status, quantity_available, unit, title")
      .eq("id", cartItem.listing_id)
      .single();

    if (listingError || !listing || listing.status !== "active") {
      return NextResponse.json({ success: false, error: "Listing not available" }, { status: 400 });
    }

    if (qty > listing.quantity_available) {
      return NextResponse.json({
        success: false,
        error: `Only ${listing.quantity_available} ${listing.unit} available for ${listing.title}.`,
      }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("cart_items")
      .update({ quantity: qty })
      .eq("id", id)
      .eq("buyer_id", profile.id)
      .select()
      .single();

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 });

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{  id: string  }> }) {
  try {
    const { profile } = await requireRole("buyer");
    const supabase = await createClient();
    const { id } = await params;

    const { error } = await supabase
      .from("cart_items")
      .delete()
      .eq("id", id)
      .eq("buyer_id", profile.id);

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 });

    return NextResponse.json({ success: true, data: { message: "Item removed from cart" } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
