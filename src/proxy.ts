import { updateSession } from "@/lib/supabase/middleware";
import { NextResponse, type NextRequest } from "next/server";

const CSRF_SAFE_METHODS = ["GET", "HEAD", "OPTIONS"];
// Paths that don't need CSRF (auth endpoints used by external clients)
const CSRF_EXEMPT_PATHS = ["/api/auth/login", "/api/auth/register", "/api/auth/logout", "/api/auth/reset-password", "/api/payments/callback"];
// In production, use a proper secret from env
const CSRF_SECRET = process.env.CSRF_SECRET || "zuri-mkulima-csrf-secret";

async function generateCsrfToken(): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${CSRF_SECRET}-${Date.now()}-${Math.random()}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Pass through static assets and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico)$/)
  ) {
    return NextResponse.next();
  }

  // Refresh Supabase session
  let response = await updateSession(request);

  // Add security headers
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );
  response.headers.set("X-XSS-Protection", "1; mode=block");

  // Set CSRF token cookie if not present (non-httpOnly so JS can read it)
  if (!request.cookies.get("csrf-token")) {
    const token = await generateCsrfToken();
    response.cookies.set("csrf-token", token, {
      httpOnly: false, // JS needs to read this for double-submit pattern
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60, // 1 hour
    });
    response.headers.set("x-csrf-token", token);
  }

  // Expose CSRF token for client use
  const existingToken = request.cookies.get("csrf-token")?.value;
  if (existingToken) {
    response.headers.set("x-csrf-token", existingToken);
  }

  // CSRF check for state-changing requests (skip exempt paths)
  const isExempt = CSRF_EXEMPT_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
  if (!CSRF_SAFE_METHODS.includes(request.method) && !isExempt) {
    const csrfHeader = request.headers.get("x-csrf-token");
    const csrfCookie = request.cookies.get("csrf-token")?.value;

    if (!csrfHeader || !csrfCookie || csrfHeader !== csrfCookie) {
      return NextResponse.json(
        { success: false, error: "CSRF token validation failed" },
        { status: 403 }
      );
    }
  }

  return response;
}
