import { NextResponse } from "next/server";

import { createSession } from "@/lib/auth";
import { handleApiError } from "@/lib/errors";
import { enforceRateLimit, getRequestIp } from "@/lib/security";
import { registerUser } from "@/lib/services";

export async function POST(request: Request) {
  try {
    const ip = getRequestIp(request);
    enforceRateLimit({
      key: `register:${ip}`,
      limit: 8,
      windowMs: 60 * 60 * 1000,
    });

    const body = await request.json();

    const result = await registerUser({
      fullName: body.fullName,
      email: body.email,
      password: body.password,
      role: body.role,
      phone: body.phone,
      county: body.county,
    });

    await createSession(result.session);

    return NextResponse.json({
      status: "success",
      message: "Account created successfully.",
      data: result.user,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
