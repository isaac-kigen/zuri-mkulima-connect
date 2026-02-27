import { NextResponse } from "next/server";

import { AppError, handleApiError } from "@/lib/errors";
import { requireVerifiedPaymentCallback } from "@/lib/security";
import { processPaymentCallback } from "@/lib/services";

export async function POST(request: Request) {
  try {
    requireVerifiedPaymentCallback(request);
    const payload = await request.json();

    const callback = payload?.Body?.stkCallback ?? payload;
    const checkoutRequestId = callback?.CheckoutRequestID;

    if (!checkoutRequestId) {
      throw new AppError("CheckoutRequestID is required in callback payload.", {
        status: 400,
        code: "VALIDATION_ERROR",
      });
    }

    const result = await processPaymentCallback({
      checkoutRequestId,
      resultCode: Number(callback.ResultCode ?? 1),
      resultDesc: callback.ResultDesc ?? "Callback received",
      mpesaReceiptNumber:
        callback.CallbackMetadata?.Item?.find((item: { Name: string; Value: string }) => item.Name === "MpesaReceiptNumber")?.Value,
      transactionDate:
        callback.CallbackMetadata?.Item?.find((item: { Name: string; Value: string }) => item.Name === "TransactionDate")?.Value,
      phoneNumber:
        callback.CallbackMetadata?.Item?.find((item: { Name: string; Value: string }) => item.Name === "PhoneNumber")?.Value,
      payload,
    });

    return NextResponse.json({
      status: "success",
      message: "Callback processed.",
      data: result,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
