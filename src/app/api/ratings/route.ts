import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireRole, requireAuth, createNotification } from "@/lib/auth/roles";

/**
 * GET ratings for a farmer or listing.
 * Query params:
 *   - farmer_id: get farmer ratings
 *   - listing_id: get listing ratings
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const supabase = await createClient();
    const { searchParams } = request.nextUrl;
    const farmer_id = searchParams.get("farmer_id");
    const listing_id = searchParams.get("listing_id");

    let result: any = { stats: null, ratings: [], listing_ratings: [] };

    // Get farmer ratings + stats
    if (farmer_id) {
      const { data: stats, error: statsError } = await supabase.rpc("get_farmer_stats", {
        p_farmer_id: farmer_id,
      });

      if (!statsError) {
        result.stats = stats?.[0] || null;
      }

      const { data: ratings, error: ratingsError } = await supabase
        .from("ratings")
        .select("*, buyer:profiles!ratings_buyer_id_fkey(id, full_name, avatar_url), order:orders!ratings_order_id_fkey(id, listing_id)")
        .eq("farmer_id", farmer_id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (!ratingsError) {
        result.ratings = ratings || [];
      }
    }

    // Get listing-specific ratings
    if (listing_id) {
      const { data: listingRatings, error: lrError } = await supabase
        .from("listing_ratings")
        .select("*, buyer:profiles!listing_ratings_buyer_id_fkey(id, full_name, avatar_url)")
        .eq("listing_id", listing_id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (!lrError) {
        result.listing_ratings = listingRatings || [];
      }
    }

    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * POST — Submit ratings (farmer rating + optional listing rating).
 * Buyer MUST have a completed order with the farmer/listing.
 *
 * Body:
 * {
 *   order_id: string (required),
 *   farmer_rating: number (1-5, required),
 *   farmer_review: string (optional),
 *   listing_rating: number (1-5, optional — rates the specific listing),
 *   listing_review: string (optional)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const { profile } = await requireRole("buyer");
    const supabase = await createClient();

    const body = await request.json();
    const {
      order_id,
      farmer_rating,
      farmer_review,
      listing_rating,
      listing_review,
    } = body;

    if (!order_id) {
      return NextResponse.json({ success: false, error: "order_id is required" }, { status: 400 });
    }

    if (!farmer_rating || farmer_rating < 1 || farmer_rating > 5) {
      return NextResponse.json(
        { success: false, error: "farmer_rating (1-5) is required" },
        { status: 400 }
      );
    }

    // --- Validate: order must be COMPLETED and belong to this buyer ---
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", order_id)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }

    if (order.buyer_id !== profile.id) {
      return NextResponse.json(
        { success: false, error: "This order does not belong to you" },
        { status: 403 }
      );
    }

    if (order.status !== "completed") {
      return NextResponse.json(
        {
          success: false,
          error: "You can only rate after the order is completed. Current status: " + order.status,
          code: "ORDER_NOT_COMPLETED",
        },
        { status: 400 }
      );
    }

    // --- Check if buyer already rated this order's farmer ---
    const { data: existingFarmerRating } = await supabase
      .from("ratings")
      .select("id")
      .eq("order_id", order_id)
      .eq("buyer_id", profile.id)
      .maybeSingle();

    if (existingFarmerRating) {
      return NextResponse.json(
        { success: false, error: "You have already rated the farmer for this order", code: "ALREADY_RATED_FARMER" },
        { status: 400 }
      );
    }

    // --- Submit farmer rating ---
    const { data: farmerRatingData, error: farmerRatingError } = await supabase
      .from("ratings")
      .insert({
        farmer_id: order.farmer_id,
        buyer_id: profile.id,
        order_id,
        rating: Number(farmer_rating),
        review: farmer_review || null,
      })
      .select()
      .single();

    if (farmerRatingError) {
      if (farmerRatingError.code === "23505") {
        return NextResponse.json(
          { success: false, error: "You have already rated this order" },
          { status: 400 }
        );
      }
      return NextResponse.json({ success: false, error: farmerRatingError.message }, { status: 400 });
    }

    // --- Submit listing rating (optional but part of two-way rating) ---
    let listingRatingData = null;
    if (listing_rating && listing_rating >= 1 && listing_rating <= 5) {
      // Check if already rated this listing for this order
      const { data: existingListingRating } = await supabase
        .from("listing_ratings")
        .select("id")
        .eq("order_id", order_id)
        .eq("buyer_id", profile.id)
        .maybeSingle();

      if (!existingListingRating) {
        const { data: lr, error: lrError } = await supabase
          .from("listing_ratings")
          .insert({
            listing_id: order.listing_id,
            buyer_id: profile.id,
            order_id,
            rating: Number(listing_rating),
            review: listing_review || null,
          })
          .select()
          .single();

        if (!lrError) {
          listingRatingData = lr;
        }
      }
    }

    // Notify farmer about the rating
    const ratingSummary = listingRatingData
      ? `Farmer: ${farmer_rating}★ | Listing: ${listing_rating}★`
      : `${farmer_rating}★`;
    await createNotification(
      supabase,
      order.farmer_id,
      "New Rating Received",
      `${profile.full_name} rated you ${ratingSummary}${farmer_review ? ` — "${farmer_review}"` : ""}`,
      "new_rating",
      farmerRatingData.id
    );

    return NextResponse.json({
      success: true,
      data: {
        farmer_rating: farmerRatingData,
        listing_rating: listingRatingData,
        message: listingRatingData
          ? "Thank you! Both farmer and listing ratings submitted."
          : "Thank you! Farmer rating submitted.",
      },
    }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
