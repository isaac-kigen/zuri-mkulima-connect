import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createNotification } from "@/lib/auth/roles";
import { checkRateLimit, RateLimits } from "@/lib/utils/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    const rl = checkRateLimit(`register:${ip}`, RateLimits.REGISTRATION.max, RateLimits.REGISTRATION.window);
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many registration attempts. Try again later." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
      );
    }

    const { email, password, full_name, phone, county, role } = await request.json();
    if (!email || !password || !full_name || !phone || !county) {
      return NextResponse.json({ success: false, error: "All fields required" }, { status: 400 });
    }

    const validRoles = ["farmer", "buyer"];
    const userRole = validRoles.includes(role) ? role : "buyer";

    const supabase = await createClient();

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name, role: userRole },
      },
    });

    if (authError) {
      return NextResponse.json({ success: false, error: authError.message }, { status: 400 });
    }

    if (!authData.user) {
      return NextResponse.json({ success: false, error: "Registration failed" }, { status: 500 });
    }

    // Create profile — farmers start with vetting_status = null (not yet submitted)
    const { error: profileError } = await supabase.from("profiles").insert({
      id: authData.user.id,
      role: userRole,
      full_name,
      phone,
      county,
      // Farmers need to submit vetting form; buyers are auto-approved
      vetting_status: userRole === "buyer" ? "approved" : null,
    });

    if (profileError) {
      return NextResponse.json({ success: false, error: profileError.message }, { status: 400 });
    }

    // Notify all admins of new registration
    try {
      const serviceClient = createServiceClient();
      const { data: admins } = await serviceClient.from("profiles").select("id").eq("role", "admin");
      if (admins) {
        for (const admin of admins) {
          await createNotification(
            supabase,
            admin.id,
            "New User Registered",
            `${full_name} (${userRole}) from ${county} just registered.${userRole === "farmer" ? " They will need vetting approval." : ""}`,
            "new_user",
            authData.user.id
          );
        }
      }
    } catch {
      // Non-critical: don't fail registration if notification fails
    }

    return NextResponse.json({
      success: true,
      data: {
        user: authData.user,
        message: userRole === "farmer"
          ? "Registration successful! Check your email to confirm, then submit your farm vetting form."
          : "Registration successful. Check your email to confirm.",
        requires_vetting: userRole === "farmer",
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Registration failed" }, { status: 500 });
  }
}
