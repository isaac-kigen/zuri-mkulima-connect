import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireRole, writeAuditLog, createNotification } from "@/lib/auth/roles";

export async function GET() {
  try {
    await requireRole("admin");
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: err.message === "Insufficient permissions" ? 403 : 500 });
  }
}
