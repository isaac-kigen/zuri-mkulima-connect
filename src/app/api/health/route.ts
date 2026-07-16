import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("profiles").select("count", { count: "exact", head: true });
    const dbUp = !error;

    return NextResponse.json({
      success: true,
      data: {
        status: "healthy",
        database: dbUp ? "connected" : "disconnected",
        timestamp: new Date().toISOString(),
        version: "1.0.0",
        environment: process.env.NODE_ENV || "development",
      },
    });
  } catch {
    return NextResponse.json({
      success: false,
      error: "Service unavailable",
    }, { status: 503 });
  }
}
