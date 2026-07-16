import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth, requireRole, writeAuditLog, createNotification } from "@/lib/auth/roles";

export async function GET(request: NextRequest, { params }: { params: Promise<{  id: string  }> }) {
  try {
    const supabase = await createClient();
    const { id } = await params;
    const { data, error } = await supabase
      .from("listings")
      .select("*, farmer:profiles!listings_farmer_id_fkey(id, full_name, county, avatar_url)")
      .eq("id", id)
      .single();

    if (error || !data) {
      return NextResponse.json({ success: false, error: "Listing not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{  id: string  }> }) {
  try {
    const { profile } = await requireAuth();
    const supabase = await createClient();
    const { id } = await params;

    const { data: listing } = await supabase.from("listings").select("*").eq("id", id).single();
    if (!listing) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

    const isAdmin = profile.role === "admin";
    const isOwner = listing.farmer_id === profile.id;

    if (!isAdmin && !isOwner) {
      return NextResponse.json({ success: false, error: "Insufficient permissions" }, { status: 403 });
    }

    const body = await request.json();

    // Admin can set status/archive_reason on any listing
    if (isAdmin) {
      const allowedAdminFields: any = {};
      if (body.status) allowedAdminFields.status = body.status;
      if (body.archive_reason !== undefined) allowedAdminFields.archive_reason = body.archive_reason;
      if (body.status === "archived") allowedAdminFields.archived_at = new Date().toISOString();
      const { error } = await supabase.from("listings").update(allowedAdminFields).eq("id", id);
      if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 });

      // Notify the farmer if admin changed status to archived
      if (body.status === "archived") {
        await createNotification(
          supabase, listing.farmer_id,
          "Listing Archived",
          `Your listing "${listing.title}" has been archived by an admin. Reason: ${body.archive_reason || "No reason provided"}`,
          "listing_archived", listing.id
        );
      }

      await writeAuditLog(supabase, profile.id, "admin_update_listing", "listing", id, body);
    }

    // Owner can edit own listing fields
    if (isOwner) {
      const allowedFields: any = {};
      const editable = ["title", "description", "category", "price_kes", "quantity_available", "unit", "location_county", "location_ward", "photos", "status"];
      for (const field of editable) {
        if (body[field] !== undefined) allowedFields[field] = body[field];
      }
      if (Object.keys(allowedFields).length > 0) {
        const { error } = await supabase.from("listings").update(allowedFields).eq("id", id);
        if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 });
      }
    }

    const { data: updated } = await supabase.from("listings").select("*").eq("id", id).single();
    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{  id: string  }> }) {
  try {
    const { profile } = await requireRole("admin");
    const supabase = await createClient();
    const { id } = await params;

    const { data: listing } = await supabase.from("listings").select("id, title, farmer_id").eq("id", id).single();

    const body = await request.json().catch(() => ({}));
    const { error } = await supabase.from("listings").update({
      status: "archived",
      archive_reason: body.reason || "Admin archived",
      archived_at: new Date().toISOString(),
    }).eq("id", id);

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 });

    if (listing) {
      await createNotification(
        supabase, listing.farmer_id,
        "Listing Archived",
        `Your listing "${listing.title}" has been archived by an admin. Reason: ${body.reason || "Admin archived"}`,
        "listing_archived", listing.id
      );
    }

    await writeAuditLog(supabase, profile.id, "archive_listing", "listing", id, body);

    return NextResponse.json({ success: true, data: { message: "Listing archived" } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
