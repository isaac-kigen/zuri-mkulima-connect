import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/errors";
import { enforceRateLimit, getRequestIp } from "@/lib/security";
import { initiatePayment } from "@/lib/services";

export async function POST(request: Request) {
  try {
    const ip = getRequestIp(request);
    enforceRateLimit({
      key: `payment-initiate:${ip}`,
      limit: 20,
      windowMs: 15 * 60 * 1000,
    });

    const user = await requireUser(["buyer"]);
    const body = await request.json();

    const result = await initiatePayment({
      orderId: body.order_id ?? body.orderId,
      buyerId: user.id,
      phoneNumber: body.phone_number ?? body.phoneNumber,
    });

    return NextResponse.json({
      status: "pending",
      message: result.message,
      checkout_request_id: result.payment.checkoutRequestId,
      data: result,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
