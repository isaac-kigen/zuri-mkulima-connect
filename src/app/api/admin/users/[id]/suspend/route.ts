import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireRole, writeAuditLog, createNotification } from "@/lib/auth/roles";

export async function POST(request: NextRequest, { params }: { params: Promise<{  id: string  }> }) {
  try {
    const { profile } = await requireRole("admin");
    const supabase = await createClient();
    const { id } = await params;

    const { reason } = await request.json();

    const { error } = await supabase
      .from("profiles")
      .update({
        is_suspended: true,
        suspended_at: new Date().toISOString(),
        suspended_reason: reason || "Suspended by admin",
      })
      .eq("id", id);

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 });

    await createNotification(supabase, id, "Account Suspended", `Your account has been suspended: ${reason || "Contact admin"}`, "account_suspended");
    await writeAuditLog(supabase, profile.id, "suspend_user", "user", id, { reason });

    return NextResponse.json({ success: true, data: { message: "User suspended" } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
