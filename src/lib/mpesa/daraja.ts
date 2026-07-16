// ============================================================
// M-Pesa Daraja API Integration (Lipa Na M-Pesa Online / STK Push)
// ============================================================

const MPESA_CONSUMER_KEY = process.env.MPESA_CONSUMER_KEY || "";
const MPESA_CONSUMER_SECRET = process.env.MPESA_CONSUMER_SECRET || "";
const MPESA_PASSKEY = process.env.MPESA_PASSKEY || "";
const MPESA_SHORTCODE = process.env.MPESA_SHORTCODE || "174379";
const MPESA_ENV = process.env.MPESA_ENV || "sandbox";

// Build a proper callback URL. M-Pesa requires:
// 1. A publicly accessible HTTPS URL (not localhost)
// 2. The domain must be whitelisted in your Daraja app settings
// For local dev, use ngrok:  https://xxxx.ngrok.io
// For production, use your actual domain: https://zuri-mkulima-connect.com
const rawBaseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const CALLBACK_BASE_URL = rawBaseUrl
  .replace(/^http:\/\/(localhost|127\.0\.0\.1)/, "https://$1")
  .replace(/\/+$/, ""); // strip trailing slash

const BASE_URL =
  MPESA_ENV === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";

interface AuthToken {
  access_token: string;
  expires_at: number;
}

let cachedToken: AuthToken | null = null;

/**
 * Get OAuth access token from M-Pesa.
 * Tokens are cached and auto-refreshed ~1 minute before expiry.
 */
async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expires_at > Date.now() + 60_000) {
    return cachedToken.access_token;
  }

  if (!MPESA_CONSUMER_KEY || !MPESA_CONSUMER_SECRET) {
    throw new Error(
      "M-Pesa credentials not configured. Set MPESA_CONSUMER_KEY and MPESA_CONSUMER_SECRET in .env.local"
    );
  }

  const auth = Buffer.from(`${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`).toString("base64");

  const res = await fetch(`${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
    method: "GET",
    headers: { Authorization: `Basic ${auth}` },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`M-Pesa auth failed (${res.status}): ${errText}`);
  }

  const data = await res.json();

  if (!data.access_token) {
    throw new Error(`M-Pesa auth response missing access_token: ${JSON.stringify(data)}`);
  }

  cachedToken = {
    access_token: data.access_token,
    expires_at: Date.now() + (data.expires_in || 3599) * 1000,
  };

  console.log(`[M-Pesa] Access token obtained, expires in ${data.expires_in || 3599}s`);
  return cachedToken.access_token;
}

/**
 * Generate M-Pesa password: base64(Shortcode + Passkey + Timestamp)
 */
function generatePassword(timestamp: string): string {
  return Buffer.from(`${MPESA_SHORTCODE}${MPESA_PASSKEY}${timestamp}`).toString("base64");
}

/**
 * Format a Kenyan phone number to M-Pesa 254XXXXXXXXX format.
 * Accepts: 07XX XXX XXX, +2547XX XXX XXX, 2547XX XXX XXX
 */
export function formatMpesaPhone(phone: string): string {
  let cleaned = phone.replace(/[\s\-\(\)]/g, "");
  if (cleaned.startsWith("+")) cleaned = cleaned.slice(1);
  if (cleaned.startsWith("0")) cleaned = "254" + cleaned.slice(1);
  if (!cleaned.startsWith("254")) cleaned = "254" + cleaned;
  return cleaned;
}

/**
 * Truncate a string to fit M-Pesa's character limits.
 * AccountReference: max 12 chars
 * TransactionDesc:  max 13 chars
 */
function truncate(value: string, maxLen: number): string {
  if (value.length <= maxLen) return value;
  return value.slice(0, maxLen - 3) + "...";
}

/**
 * Initiate STK Push payment (Lipa Na M-Pesa Online).
 *
 * M-Pesa limits:
 * - AccountReference: max 12 characters
 * - TransactionDesc:  max 13 characters
 * - Amount:           min KES 1, max KES 250,000 per transaction
 * - CallbackURL:      must be public HTTPS
 */
export async function initiateStkPush(params: {
  phoneNumber: string;
  amount: number;
  accountReference: string;
  transactionDesc: string;
  /** Override the callback URL (useful when the server knows its real host) */
  callbackUrl?: string;
}): Promise<{
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
}> {
  const token = await getAccessToken();

  // Timestamp format: YYYYMMDDHHmmss (M-Pesa requirement)
  const now = new Date();
  const timestamp =
    now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, "0") +
    String(now.getDate()).padStart(2, "0") +
    String(now.getHours()).padStart(2, "0") +
    String(now.getMinutes()).padStart(2, "0") +
    String(now.getSeconds()).padStart(2, "0");

  const password = generatePassword(timestamp);
  const phone = formatMpesaPhone(params.phoneNumber);
  const callbackUrl = params.callbackUrl || `${CALLBACK_BASE_URL}/api/payments/callback`;

  // Validate callback URL — M-Pesa requires a public, whitelisted HTTPS URL
  if (callbackUrl.includes("localhost") || callbackUrl.includes("127.0.0.1")) {
    console.warn(
      `[M-Pesa] ⚠️  Callback URL is localhost: "${callbackUrl}". ` +
      `M-Pesa will NOT be able to reach this. ` +
      `Use ngrok (https://ngrok.com) and set NEXT_PUBLIC_SITE_URL=https://YOUR-ID.ngrok.io`
    );
  }

  if (!callbackUrl.startsWith("https://")) {
    throw new Error(
      `M-Pesa callback URL must be HTTPS, got: "${callbackUrl}". ` +
      `Set NEXT_PUBLIC_SITE_URL=https://your-domain.com in .env.local`
    );
  }

  const body = {
    BusinessShortCode: MPESA_SHORTCODE,
    Password: password,
    Timestamp: timestamp,
    TransactionType: "CustomerPayBillOnline",
    Amount: String(Math.ceil(params.amount)),
    PartyA: phone,
    PartyB: MPESA_SHORTCODE,
    PhoneNumber: phone,
    CallBackURL: callbackUrl,
    AccountReference: truncate(params.accountReference, 12),
    TransactionDesc: truncate(params.transactionDesc, 13),
  };

  console.log("[M-Pesa] STK Push request:", {
    phone,
    amount: body.Amount,
    reference: body.AccountReference,
    callback: callbackUrl,
  });

  const res = await fetch(`${BASE_URL}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const responseData = await res.json();

  if (!res.ok || responseData.ResponseCode !== "0") {
    const errMsg =
      responseData.errorMessage ||
      responseData.ResponseDescription ||
      responseData.errorCode ||
      "Unknown error";
    throw new Error(`M-Pesa STK push failed: ${errMsg}`);
  }

  console.log("[M-Pesa] STK Push accepted:", {
    merchantRequestId: responseData.MerchantRequestID,
    checkoutRequestId: responseData.CheckoutRequestID,
  });

  return responseData;
}

/**
 * Query STK Push transaction status.
 * Useful as a fallback if the callback doesn't arrive.
 */
export async function queryStkStatus(
  checkoutRequestId: string
): Promise<{
  ResultCode: string;
  ResultDesc: string;
  MpesaReceiptNumber?: string;
  Amount?: number;
  PhoneNumber?: string;
}> {
  const token = await getAccessToken();

  const now = new Date();
  const timestamp =
    now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, "0") +
    String(now.getDate()).padStart(2, "0") +
    String(now.getHours()).padStart(2, "0") +
    String(now.getMinutes()).padStart(2, "0") +
    String(now.getSeconds()).padStart(2, "0");

  const password = generatePassword(timestamp);

  const body = {
    BusinessShortCode: MPESA_SHORTCODE,
    Password: password,
    Timestamp: timestamp,
    CheckoutRequestID: checkoutRequestId,
  };

  const res = await fetch(`${BASE_URL}/mpesa/stkpushquery/v1/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`M-Pesa query failed (${res.status}): ${errText}`);
  }

  return res.json();
}

export { getAccessToken };
