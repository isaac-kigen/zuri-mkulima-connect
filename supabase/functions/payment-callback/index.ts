// Supabase Edge Function: payment-callback
// Receives Daraja callback payload and forwards to DB RPC with service role credentials.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "content-type": "application/json" },
    });
  }

  try {
    const payload = await req.json();
    const callback = payload?.Body?.stkCallback ?? payload;

    const checkoutRequestId = callback?.CheckoutRequestID;
    const resultCode = Number(callback?.ResultCode ?? 1);
    const resultDesc = String(callback?.ResultDesc ?? "Callback received");

    if (!checkoutRequestId) {
      return new Response(
        JSON.stringify({
          status: "error",
          code: "VALIDATION_ERROR",
          message: "CheckoutRequestID is required",
        }),
        {
          status: 400,
          headers: { "content-type": "application/json" },
        },
      );
    }

    const metadataItems = callback?.CallbackMetadata?.Item ?? [];

    const mpesaReceipt = metadataItems.find((item: { Name: string }) => item.Name === "MpesaReceiptNumber")?.Value ?? null;
    const phoneNumber = metadataItems.find((item: { Name: string }) => item.Name === "PhoneNumber")?.Value ?? null;

    const { data, error } = await supabase.rpc("process_payment_callback", {
      p_checkout_request_id: checkoutRequestId,
      p_result_code: resultCode,
      p_result_desc: resultDesc,
      p_mpesa_receipt_number: mpesaReceipt,
      p_phone_number: phoneNumber,
      p_payload: payload,
    });

    if (error) {
      return new Response(
        JSON.stringify({
          status: "error",
          code: "RPC_ERROR",
          message: error.message,
          details: error,
        }),
        {
          status: 400,
          headers: { "content-type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({
        status: "success",
        data,
      }),
      {
        status: 200,
        headers: { "content-type": "application/json" },
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        status: "error",
        code: "INTERNAL_ERROR",
        message: error instanceof Error ? error.message : "Unexpected error",
      }),
      {
        status: 500,
        headers: { "content-type": "application/json" },
      },
    );
  }
});
