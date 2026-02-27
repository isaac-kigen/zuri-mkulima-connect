import { NextResponse } from "next/server";

import { AppError, handleApiError } from "@/lib/errors";
import { enforceRateLimit, getRequestIp } from "@/lib/security";
import { createSession, validateCredentials } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const ip = getRequestIp(request);
    enforceRateLimit({
      key: `login:${ip}`,
      limit: 10,
      windowMs: 15 * 60 * 1000,
    });

    const body = await request.json();

    const result = await validateCredentials(body.email ?? "", body.password ?? "");
    if (!result) {
      throw new AppError("Invalid email or password.", {
        status: 401,
        code: "INVALID_CREDENTIALS",
      });
    }

    if (result.user.isSuspended) {
      throw new AppError("Account is suspended.", {
        status: 403,
        code: "ACCOUNT_SUSPENDED",
      });
    }

    await createSession(result.session);

    return NextResponse.json({
      status: "success",
      message: "Login successful.",
      data: result.user,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
