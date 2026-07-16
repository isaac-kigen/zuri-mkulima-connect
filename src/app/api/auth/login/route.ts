import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, RateLimits } from "@/lib/utils/rate-limit";

export async function POST(request: NextRequest) {
  try {
    // Rate limit
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    const rl = checkRateLimit(`login:${ip}`, RateLimits.LOGIN.max, RateLimits.LOGIN.window);
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many login attempts. Try again later." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
      );
    }

    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ success: false, error: "Email and password required" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }

    // Check if suspended & fetch role for client-side routing
    const { data: profile } = await supabase.from("profiles").select("role, is_suspended, suspended_reason, full_name").eq("id", data.user.id).single();
    if (profile?.is_suspended) {
      await supabase.auth.signOut();
      return NextResponse.json({
        success: false,
        error: `Account suspended: ${profile.suspended_reason || "Contact admin"}`,
      }, { status: 403 });
    }

    return NextResponse.json({ success: true, data: { user: data.user, profile } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Login failed" }, { status: 500 });
  }
}
