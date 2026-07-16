import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth, requireRole, writeAuditLog, createNotification } from "@/lib/auth/roles";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * GET /api/vetting
 * - Farmer: view own vetting status
 * - Admin: list all vetting forms (supports ?status=pending&page=1&limit=20)
 */
export async function GET(request: NextRequest) {
  try {
    const { profile } = await requireAuth();
    const supabase = await createClient();
    const { searchParams } = request.nextUrl;

    if (profile.role === "farmer") {
      // Farmer sees own vetting form + profile vetting status
      const { data: form } = await supabase
        .from("vetting_forms")
        .select("*")
        .eq("farmer_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data: profileData } = await supabase
        .from("profiles")
        .select("vetting_status, vetting_submitted_at, vetting_reviewed_at, vetting_notes")
        .eq("id", profile.id)
        .single();

      return NextResponse.json({
        success: true,
        data: {
          vetting_form: form || null,
          vetting_status: profileData?.vetting_status || null,
          vetting_submitted_at: profileData?.vetting_submitted_at || null,
          vetting_reviewed_at: profileData?.vetting_reviewed_at || null,
          vetting_notes: profileData?.vetting_notes || null,
        },
      });
    }

    // Admin: list vetting forms
    if (profile.role !== "admin") {
      return NextResponse.json({ success: false, error: "Insufficient permissions" }, { status: 403 });
    }

    const status = searchParams.get("status");
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") || 20)));

    let query = supabase
      .from("vetting_forms")
      .select("*, farmer:profiles!vetting_forms_farmer_id_fkey(id, full_name, county, phone), reviewer:profiles!vetting_forms_reviewed_by_fkey(id, full_name)", { count: "exact" })
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, count, error } = await query;

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });

    return NextResponse.json({
      success: true,
      data,
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

/**
 * POST /api/vetting
 * Farmers submit their vetting form.
 * Body: { farm_name, farm_location_county, farm_location_ward?, farm_size_acres?, products_grown, years_farming?, phone_number, id_number?, supporting_document_url? }
 */
export async function POST(request: NextRequest) {
  try {
    const { profile } = await requireRole("farmer");
    const supabase = await createClient();

    // Check current vetting status — don't allow duplicate pending submissions
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("vetting_status")
      .eq("id", profile.id)
      .single();

    if (existingProfile?.vetting_status === "pending") {
      return NextResponse.json(
        { success: false, error: "Your vetting is already pending review. Please wait for admin approval." },
        { status: 400 }
      );
    }

    if (existingProfile?.vetting_status === "approved") {
      return NextResponse.json(
        { success: false, error: "Your account is already vetted and approved." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      farm_name,
      farm_location_county,
      farm_location_ward,
      farm_size_acres,
      products_grown,
      years_farming,
      phone_number,
      id_number,
      supporting_document_url,
    } = body;

    if (!farm_name || !farm_location_county || !products_grown) {
      return NextResponse.json(
        { success: false, error: "farm_name, farm_location_county, and products_grown are required" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    // Create vetting form
    const { data: form, error: formError } = await supabase
      .from("vetting_forms")
      .insert({
        farmer_id: profile.id,
        farm_name,
        farm_location_county,
        farm_location_ward: farm_location_ward || null,
        farm_size_acres: farm_size_acres ? Number(farm_size_acres) : null,
        products_grown,
        years_farming: years_farming ? Number(years_farming) : null,
        phone_number: phone_number || profile.phone,
        id_number: id_number || null,
        supporting_document_url: supporting_document_url || null,
        status: "pending",
        submitted_at: now,
      })
      .select()
      .single();

    if (formError) {
      return NextResponse.json({ success: false, error: formError.message }, { status: 400 });
    }

    // Update profile vetting status
    await supabase
      .from("profiles")
      .update({
        vetting_status: "pending",
        vetting_submitted_at: now,
      })
      .eq("id", profile.id);

    // Notify all admins
    try {
      const serviceClient = createServiceClient();
      const { data: admins } = await serviceClient.from("profiles").select("id").eq("role", "admin");
      if (admins) {
        for (const admin of admins) {
          await createNotification(
            supabase,
            admin.id,
            "New Vetting Submission",
            `${profile.full_name} (${farm_name}) from ${farm_location_county} submitted a vetting form. Products: ${products_grown}`,
            "vetting_new",
            form.id
          );
        }
      }
    } catch {
      // Non-critical
    }

    await writeAuditLog(supabase, profile.id, "submit_vetting", "vetting_form", form.id);

    return NextResponse.json({
      success: true,
      data: form,
      message: "Vetting form submitted successfully. An admin will review it shortly.",
    }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * PATCH /api/vetting
 * Admin approves/rejects a vetting form.
 * Body: { form_id, status: "approved"|"rejected", admin_notes? }
 */
export async function PATCH(request: NextRequest) {
  try {
    const { profile } = await requireRole("admin");
    const supabase = await createClient();

    const { form_id, status, admin_notes } = await request.json();

    if (!form_id || !status || !["approved", "rejected"].includes(status)) {
      return NextResponse.json(
        { success: false, error: "form_id and status (approved|rejected) required" },
        { status: 400 }
      );
    }

    // Get the vetting form
    const { data: form } = await supabase
      .from("vetting_forms")
      .select("*")
      .eq("id", form_id)
      .single();

    if (!form) {
      return NextResponse.json({ success: false, error: "Vetting form not found" }, { status: 404 });
    }

    if (form.status !== "pending") {
      return NextResponse.json(
        { success: false, error: `Form already ${form.status}` },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    // Update vetting form
    await supabase
      .from("vetting_forms")
      .update({
        status,
        admin_notes: admin_notes || null,
        reviewed_by: profile.id,
        reviewed_at: now,
      })
      .eq("id", form_id);

    // Update farmer profile vetting status using the service client so admin approvals
    // are reflected immediately for the farmer's access checks.
    const serviceClient = createServiceClient();
    const { error: profileUpdateError } = await serviceClient
      .from("profiles")
      .update({
        vetting_status: status,
        vetting_reviewed_at: now,
        vetting_notes: admin_notes || null,
      })
      .eq("id", form.farmer_id);

    if (profileUpdateError) {
      return NextResponse.json({ success: false, error: profileUpdateError.message }, { status: 500 });
    }

    // Notify farmer
    const statusLabel = status === "approved" ? "approved ✅" : "rejected ❌";
    await createNotification(
      supabase,
      form.farmer_id,
      `Vetting ${statusLabel}`,
      status === "approved"
        ? "Congratulations! Your vetting has been approved. You can now create listings."
        : `Your vetting was not approved. ${admin_notes ? `Reason: ${admin_notes}` : "Please contact support for more information."}`,
      status === "approved" ? "vetting_approved" : "vetting_rejected",
      form_id
    );

    await writeAuditLog(supabase, profile.id, `${status}_vetting`, "vetting_form", form_id, {
      farmer_id: form.farmer_id,
      admin_notes,
    });

    return NextResponse.json({
      success: true,
      data: { form_id, status, message: `Vetting ${status} successfully` },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
