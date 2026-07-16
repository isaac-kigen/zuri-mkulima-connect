import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireRole, writeAuditLog, createNotification } from "@/lib/auth/roles";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { profile } = await requireRole("admin");
    const supabase = await createClient();
    const { id } = await params;

    const { error } = await supabase
      .from("profiles")
      .update({
        is_suspended: false,
        suspended_at: null,
        suspended_reason: null,
      })
      .eq("id", id);

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 });

    await createNotification(supabase, id, "Account Reactivated", "Your account has been reactivated.", "account_reactivated");
    await writeAuditLog(supabase, profile.id, "reactivate_user", "user", id);

    return NextResponse.json({ success: true, data: { message: "User reactivated" } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
