import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAuth, requireRole, writeAuditLog, createNotification } from "@/lib/auth/roles";
import { expireAcceptedOrderIfNeeded } from "@/lib/orders/payment-expiry";

const PLATFORM_FEE_PERCENT = 5; // 5% platform fee on every sale

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

export async function GET(request: NextRequest) {
  try {
    const { profile } = await requireAuth();
    const supabase = await createClient();

    let query = supabase
      .from("orders")
      .select("*, listing:listings(id, title, photos, unit, price_kes), buyer:profiles!orders_buyer_id_fkey(id, full_name, phone), farmer:profiles!orders_farmer_id_fkey(id, full_name, phone), payments:payments(*)")
      .order("created_at", { ascending: false });

    // Filter by role
    if (profile.role === "buyer") {
      query = query.eq("buyer_id", profile.id);
    } else if (profile.role === "farmer") {
      query = query.eq("farmer_id", profile.id);
    }
    // Admin sees all (no filter)

    const { data, error } = await query;
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });

    if (Array.isArray(data)) {
      const updatedOrders = [];
      for (const order of data) {
        let currentOrder = order;
        if (order?.status === "accepted") {
          const result = await expireAcceptedOrderIfNeeded(supabase, order);
          currentOrder = result.order;
        }
        updatedOrders.push(attachLatestPayment(currentOrder));
      }
      return NextResponse.json({ success: true, data: updatedOrders });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { profile } = await requireRole("buyer");
    const supabase = await createClient();

    const { listing_id, quantity, buyer_notes } = await request.json();
    if (!listing_id || !quantity) {
      return NextResponse.json({ success: false, error: "listing_id and quantity required" }, { status: 400 });
    }

    // Get listing
    const { data: listing } = await supabase.from("listings").select("*").eq("id", listing_id).single();
    if (!listing || listing.status !== "active" || listing.quantity_available <= 0) {
      return NextResponse.json({ success: false, error: "Listing not available" }, { status: 400 });
    }

    const qty = Number(quantity);
    if (qty <= 0) {
      return NextResponse.json({ success: false, error: "Quantity must be greater than 0" }, { status: 400 });
    }

    // Check stock availability
    if (qty > listing.quantity_available) {
      return NextResponse.json(
        { success: false, error: `Only ${listing.quantity_available} ${listing.unit} available` },
        { status: 400 }
      );
    }

    const totalAmount = listing.price_kes * qty;
    // Calculate 5% platform fee
    const platformFee = Math.round(totalAmount * PLATFORM_FEE_PERCENT) / 100;
    const farmerEarnings = totalAmount - platformFee;

    // --- Create the order ---
    const { data: order, error: orderError } = await supabase.from("orders").insert({
      listing_id,
      buyer_id: profile.id,
      farmer_id: listing.farmer_id,
      quantity: qty,
      total_amount_kes: totalAmount,
      platform_fee_kes: platformFee,
      farmer_earnings_kes: farmerEarnings,
      status: "pending",
      buyer_notes: buyer_notes || null,
    }).select().single();

    if (orderError) {
      return NextResponse.json({ success: false, error: orderError.message }, { status: 400 });
    }

    // --- Reduce available inventory ---
    const serviceSupabase = createServiceClient();
    const newQuantity = listing.quantity_available - qty;
    const { error: inventoryError } = await serviceSupabase
      .from("listings")
      .update({
        quantity_available: newQuantity,
        status: newQuantity <= 0 ? "inactive" : "active",
      })
      .eq("id", listing_id);

    if (inventoryError) {
      const now = new Date().toISOString();
      await supabase.from("orders").update({
        status: "cancelled",
        cancellation_reason: "Inventory update failed after order creation",
        cancelled_at: now,
      }).eq("id", order.id);

      await writeAuditLog(supabase, profile.id, "place_order_failed", "order", order.id, {
        reason: "Inventory update failed after order creation",
        inventory_before: listing.quantity_available,
        attempted_quantity: qty,
      });

      return NextResponse.json({ success: false, error: "Failed to reserve inventory. Order was cancelled." }, { status: 500 });
    }

    // Notify farmer
    await createNotification(
      supabase,
      listing.farmer_id,
      "New Order",
      `${profile.full_name} placed an order for ${qty} ${listing.unit} of ${listing.title} — KES ${totalAmount.toLocaleString()} (You earn: KES ${farmerEarnings.toLocaleString()})`,
      "order_new",
      order.id
    );

    await writeAuditLog(supabase, profile.id, "place_order", "order", order.id, {
      listing_id,
      quantity: qty,
      total_amount: totalAmount,
      platform_fee: platformFee,
      farmer_earnings: farmerEarnings,
      inventory_before: listing.quantity_available,
      inventory_after: newQuantity,
    });

    return NextResponse.json({ success: true, data: order }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
