import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/roles";

export async function GET() {
  try {
    await requireRole("admin");
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("audit_log")
      .select("*, actor:profiles!audit_log_actor_id_fkey(id, full_name, role)")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
