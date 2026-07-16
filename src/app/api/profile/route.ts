import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/roles";

export async function GET() {
  try {
    const { profile } = await requireAuth();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", profile.id)
      .single();

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { profile } = await requireAuth();
    const supabase = await createClient();

    const body = await request.json();
    const allowedFields: any = {};
    const editable = ["full_name", "phone", "county", "avatar_url"];

    for (const field of editable) {
      if (body[field] !== undefined) allowedFields[field] = body[field];
    }

    if (Object.keys(allowedFields).length === 0) {
      return NextResponse.json({ success: false, error: "No valid fields to update" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("profiles")
      .update(allowedFields)
      .eq("id", profile.id)
      .select()
      .single();

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 });

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
