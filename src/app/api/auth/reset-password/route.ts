import { NextResponse } from "next/server";

import { requestPasswordReset } from "@/lib/auth";
import { handleApiError } from "@/lib/errors";
import { enforceRateLimit, getRequestIp } from "@/lib/security";

export async function POST(request: Request) {
  try {
    const ip = getRequestIp(request);
    enforceRateLimit({
      key: `reset-password:${ip}`,
      limit: 5,
      windowMs: 15 * 60 * 1000,
    });

    const body = await request.json();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    const redirectTo = appUrl ? `${appUrl.replace(/\/$/, "")}/login` : undefined;
    await requestPasswordReset(body.email ?? "", redirectTo);

    return NextResponse.json({
      status: "success",
      message: "If an account exists for this email, a reset link has been sent.",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
