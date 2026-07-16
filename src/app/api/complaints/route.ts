import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth, requireRole, writeAuditLog, createNotification } from "@/lib/auth/roles";

export async function GET(request: NextRequest) {
  try {
    const { profile } = await requireAuth();
    const supabase = await createClient();

    let query = supabase
      .from("complaints")
      .select("*, filed_by_user:profiles!complaints_filed_by_fkey(id, full_name, role), against_user:profiles!complaints_against_user_id_fkey(id, full_name, role), responded_by_user:profiles!complaints_responded_by_fkey(id, full_name)")
      .order("created_at", { ascending: false });

    if (profile.role !== "admin") {
      query = query.eq("filed_by", profile.id);
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { profile } = await requireAuth();
    const supabase = await createClient();

    const { against_user_id, order_id, listing_id, subject, description } = await request.json();
    if (!subject || !description) {
      return NextResponse.json({ success: false, error: "subject and description required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("complaints")
      .insert({
        filed_by: profile.id,
        against_user_id: against_user_id || null,
        order_id: order_id || null,
        listing_id: listing_id || null,
        subject,
        description,
        status: "open",
      })
      .select()
      .single();

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 });

    // Notify admins
    const { data: admins } = await supabase.from("profiles").select("id").eq("role", "admin");
    if (admins) {
      for (const admin of admins) {
        await createNotification(
          supabase, admin.id,
          "New Complaint Filed",
          `${profile.full_name} filed a complaint: ${subject}`,
          "complaint_new", data.id
        );
      }
    }

    // Notify the person being complained about (if any)
    if (against_user_id) {
      await createNotification(
        supabase, against_user_id,
        "Complaint Filed Against You",
        `A complaint has been filed against you: ${subject}. An admin will review it.`,
        "complaint_against_you", data.id
      );
    }

    await writeAuditLog(supabase, profile.id, "file_complaint", "complaint", data.id);

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
