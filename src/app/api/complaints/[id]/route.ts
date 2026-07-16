import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireRole, writeAuditLog, createNotification } from "@/lib/auth/roles";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{  id: string  }> }) {
  try {
    const { profile } = await requireRole("admin");
    const supabase = await createClient();
    const { id } = await params;

    const { admin_response, status } = await request.json();

    const updateData: any = { updated_at: new Date().toISOString() };
    if (admin_response !== undefined) {
      updateData.admin_response = admin_response;
      updateData.responded_by = profile.id;
    }
    if (status) {
      updateData.status = status;
      if (status === "resolved") updateData.resolved_at = new Date().toISOString();
      if (status === "closed") updateData.closed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("complaints")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 });

    // Notify the person who filed
    await createNotification(
      supabase, data.filed_by,
      "Complaint Updated",
      `Your complaint "${data.subject}" has been updated. Status: ${data.status}`,
      "complaint_updated", data.id
    );

    // Also notify the person being complained about
    if (data.against_user_id) {
      await createNotification(
        supabase, data.against_user_id,
        "Complaint Update",
        `The complaint "${data.subject}" against you has been updated. Status: ${data.status}`,
        "complaint_updated", data.id
      );
    }

    await writeAuditLog(supabase, profile.id, "respond_complaint", "complaint", id, updateData);

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
