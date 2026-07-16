import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth, requireRole } from "@/lib/auth/roles";
import { writeAuditLog, createNotification } from "@/lib/auth/roles";
import { ListingFilters } from "@/lib/db/types";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = request.nextUrl;

    let query = supabase.from("listings").select(
      "*, farmer:profiles!listings_farmer_id_fkey(id, full_name, county, avatar_url, vetting_status)",
      { count: "exact" }
    );

    // Default: show only active listings for public browsing
    const status = searchParams.get("status") || "active";
    const role = searchParams.get("role");
    const farmerId = searchParams.get("farmer_id");
    const isAdmin = role === "admin";

    if (!isAdmin && !farmerId) {
      query = query.eq("status", "active").gt("quantity_available", 0);
    } else if (status && isAdmin) {
      query = query.eq("status", status);
    }

    if (farmerId) {
      query = query.eq("farmer_id", farmerId);
    }

    // Filters
    const category = searchParams.get("category");
    if (category) query = query.eq("category", category);

    const county = searchParams.get("county");
    if (county) query = query.eq("location_county", county);

    const minPrice = searchParams.get("min_price");
    if (minPrice) query = query.gte("price_kes", Number(minPrice));

    const maxPrice = searchParams.get("max_price");
    if (maxPrice) query = query.lte("price_kes", Number(maxPrice));

    const search = searchParams.get("search");
    if (search) query = query.ilike("title", `%${search}%`);

    // Sorting
    const sort = searchParams.get("sort") || "latest";
    switch (sort) {
      case "price_asc": query = query.order("price_kes", { ascending: true }); break;
      case "price_desc": query = query.order("price_kes", { ascending: false }); break;
      default: query = query.order("created_at", { ascending: false });
    }

    // Pagination
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") || 20)));
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    query = query.range(from, to);

    const { data: listings, count, error } = await query;

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });

    // Enrich listings with farmer brief stats
    const enrichedListings = await Promise.all(
      (listings || []).map(async (listing: any) => {
        try {
          const { data: statsData } = await supabase.rpc("get_farmer_brief_stats", {
            p_farmer_id: listing.farmer_id,
          });
          return {
            ...listing,
            farmer_stats: statsData?.[0] || null,
          };
        } catch {
          return { ...listing, farmer_stats: null };
        }
      })
    );

    return NextResponse.json({
      success: true,
      data: enrichedListings,
      pagination: {
        page,
        limit,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { profile } = await requireRole("farmer", "admin");
    const supabase = await createClient();

    // --- VETTING CHECK: Farmers must be vetted before creating a listing ---
    if (profile.role === "farmer") {
      // Fetch fresh profile with vetting status
      const { data: freshProfile } = await supabase
        .from("profiles")
        .select("vetting_status, is_suspended")
        .eq("id", profile.id)
        .single();

      if (!freshProfile || freshProfile.vetting_status !== "approved") {
        return NextResponse.json(
          {
            success: false,
            error: "Your account must be vetted and approved before creating listings. Please submit a vetting form first.",
            code: "VETTING_REQUIRED",
          },
          { status: 403 }
        );
      }

      if (freshProfile.is_suspended) {
        return NextResponse.json(
          { success: false, error: "Your account is suspended." },
          { status: 403 }
        );
      }
    }

    const body = await request.json();
    const { title, description, category, price_kes, quantity_available, unit, location_county, location_ward, photos } = body;

    if (!title || !description || !category || !price_kes || !location_county) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const { data, error } = await supabase.from("listings").insert({
      farmer_id: profile.id,
      title,
      description,
      category,
      price_kes: Number(price_kes),
      quantity_available: Number(quantity_available) || 1,
      unit: unit || "kg",
      location_county,
      location_ward: location_ward || null,
      photos: photos || [],
      status: "active",
    }).select().single();

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 });

    // Notify admins about new listing
    try {
      const serviceClient = createServiceClient();
      const { data: admins } = await serviceClient.from("profiles").select("id").eq("role", "admin");
      if (admins) {
        for (const admin of admins) {
          await createNotification(
            supabase,
            admin.id,
            "New Listing Created",
            `${profile.full_name} listed "${title}" for KES ${Number(price_kes).toLocaleString()}/${unit || "kg"} in ${location_county}`,
            "listing_new",
            data.id
          );
        }
      }
    } catch {
      // Non-critical: don't fail listing creation if notification fails
    }

    await writeAuditLog(supabase, profile.id, "create_listing", "listing", data.id);

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: err.message === "Insufficient permissions" ? 403 : 500 }
    );
  }
}
