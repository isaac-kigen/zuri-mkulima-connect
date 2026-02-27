import { randomUUID } from "node:crypto";

import type { Session } from "@supabase/supabase-js";

import type { AuthSessionPayload } from "@/lib/auth";
import { isPasswordStrong } from "@/lib/auth";
import { AppError, assertOrThrow } from "@/lib/errors";
import { createSupabaseAnonClient, createSupabaseServiceClient } from "@/lib/supabase";
import { cleanText } from "@/lib/utils";
import type {
  AdminAuditLogRecord,
  DashboardSnapshot,
  ListingPhotoRecord,
  ListingRecord,
  ListingStatus,
  ListingWithFarmer,
  NotificationRecord,
  NotificationType,
  OrderRecord,
  OrderStatus,
  OrderWithRelations,
  PaymentRecord,
  PaymentStatus,
  PublicUser,
  Role,
} from "@/lib/types";

type ProfileRow = {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  phone: string | null;
  county: string | null;
  is_suspended: boolean;
  created_at: string;
  updated_at: string;
};

type ListingRow = {
  id: string;
  farmer_id: string;
  product_name: string;
  category: string | null;
  quantity: number | string;
  unit: string;
  price_kes: number | string;
  location: string;
  description: string | null;
  status: ListingStatus;
  created_at: string;
  updated_at: string;
};

type ListingPhotoRow = {
  id: string;
  listing_id: string;
  storage_path: string;
  created_at: string;
};

type OrderRow = {
  id: string;
  listing_id: string;
  buyer_id: string;
  farmer_id: string;
  quantity: number | string;
  unit_price_kes: number | string;
  total_kes: number | string;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
};

type PaymentRow = {
  id: string;
  order_id: string;
  amount_kes: number | string;
  status: PaymentStatus;
  merchant_request_id: string | null;
  checkout_request_id: string | null;
  mpesa_receipt_number: string | null;
  transaction_date: string | null;
  phone_number: string | null;
  raw_callback: unknown | null;
  created_at: string;
  updated_at: string;
};

type NotificationRow = {
  id: string;
  recipient_id: string;
  title: string;
  message: string;
  type: NotificationType;
  is_read: boolean;
  created_at: string;
};

type AdminAuditRow = {
  id: string;
  admin_id: string;
  action: string;
  target_table: string;
  target_id: string;
  note: string | null;
  created_at: string;
};

function nowIso() {
  return new Date().toISOString();
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function assertSupabase(
  error: {
    message: string;
    code?: string;
    hint?: string | null;
    details?: string | null;
    status?: number;
  } | null,
  message: string,
) {
  if (error) {
    const rawMessage = error.message ?? "Unknown Supabase error";
    const normalized = rawMessage.toLowerCase();

    if (normalized.includes("invalid api key") || normalized.includes("jwt")) {
      throw new AppError(
        "Supabase key is invalid. Verify NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY and SUPABASE_SERVICE_ROLE_KEY in .env.local.",
        {
          status: 500,
          code: "SUPABASE_AUTH_ERROR",
          details: {
            message: rawMessage,
            code: error.code,
            hint: error.hint,
            details: error.details,
          },
        },
      );
    }

    if (error.code === "42P01" || normalized.includes("does not exist")) {
      throw new AppError(
        "Supabase schema is missing/incomplete. Run `supabase db push` to apply migrations.",
        {
          status: 500,
          code: "SUPABASE_SCHEMA_MISSING",
          details: {
            message: rawMessage,
            code: error.code,
            hint: error.hint,
            details: error.details,
          },
        },
      );
    }

    throw new AppError(message, {
      status: error.status && error.status >= 400 ? error.status : 500,
      code: "SUPABASE_QUERY_ERROR",
      details: {
        message: rawMessage,
        code: error.code,
        hint: error.hint,
        details: error.details,
      },
    });
  }
}

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function requireNonEmpty(value: string, fieldName: string) {
  assertOrThrow(value.trim().length > 0, `${fieldName} is required.`, {
    status: 400,
    code: "VALIDATION_ERROR",
  });
}

function parsePositiveNumber(value: string | number, fieldName: string) {
  const numeric = Number(value);
  assertOrThrow(Number.isFinite(numeric), `${fieldName} must be a number.`, {
    status: 400,
    code: "VALIDATION_ERROR",
  });
  assertOrThrow(numeric > 0, `${fieldName} must be greater than zero.`, {
    status: 400,
    code: "VALIDATION_ERROR",
  });
  return numeric;
}

function normalizeEmail(email: string) {
  return cleanText(email).toLowerCase();
}

function toPublicUser(row: ProfileRow): PublicUser {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    role: row.role,
    phone: row.phone,
    county: row.county,
    isSuspended: row.is_suspended,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toListingRecord(row: ListingRow): ListingRecord {
  return {
    id: row.id,
    farmerId: row.farmer_id,
    productName: row.product_name,
    category: row.category,
    quantity: toNumber(row.quantity),
    unit: row.unit,
    priceKes: toNumber(row.price_kes),
    location: row.location,
    description: row.description,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toListingPhotoRecord(row: ListingPhotoRow): ListingPhotoRecord {
  return {
    id: row.id,
    listingId: row.listing_id,
    storagePath: row.storage_path,
    createdAt: row.created_at,
  };
}

function toOrderRecord(row: OrderRow): OrderRecord {
  return {
    id: row.id,
    listingId: row.listing_id,
    buyerId: row.buyer_id,
    farmerId: row.farmer_id,
    quantity: toNumber(row.quantity),
    unitPriceKes: toNumber(row.unit_price_kes),
    totalKes: toNumber(row.total_kes),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toPaymentRecord(row: PaymentRow): PaymentRecord {
  return {
    id: row.id,
    orderId: row.order_id,
    amountKes: toNumber(row.amount_kes),
    status: row.status,
    merchantRequestId: row.merchant_request_id,
    checkoutRequestId: row.checkout_request_id,
    mpesaReceiptNumber: row.mpesa_receipt_number,
    transactionDate: row.transaction_date,
    phoneNumber: row.phone_number,
    rawCallback: row.raw_callback,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toNotificationRecord(row: NotificationRow): NotificationRecord {
  return {
    id: row.id,
    recipientId: row.recipient_id,
    title: row.title,
    message: row.message,
    type: row.type,
    isRead: row.is_read,
    createdAt: row.created_at,
  };
}

function toAdminAuditRecord(row: AdminAuditRow): AdminAuditLogRecord {
  return {
    id: row.id,
    adminId: row.admin_id,
    action: row.action,
    targetTable: row.target_table,
    targetId: row.target_id,
    note: row.note,
    createdAt: row.created_at,
  };
}

function extractSessionPayload(session: Session): AuthSessionPayload {
  assertOrThrow(session.access_token && session.refresh_token, "Invalid Supabase auth session.", {
    status: 401,
    code: "INVALID_SESSION",
  });

  const expiresAt = session.expires_at
    ? new Date(session.expires_at * 1000).toISOString()
    : new Date(Date.now() + 1000 * 60 * 60).toISOString();

  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt,
  };
}

async function getProfileById(id: string): Promise<ProfileRow | null> {
  const supabase = createSupabaseServiceClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, phone, county, is_suspended, created_at, updated_at")
    .eq("id", id)
    .maybeSingle();

  assertSupabase(error, "Failed to load profile.");
  return (data as ProfileRow | null) ?? null;
}

async function ensureActor(actorId: string) {
  const actor = await getProfileById(actorId);
  assertOrThrow(actor, "User not found.", {
    status: 404,
    code: "NOT_FOUND",
  });

  assertOrThrow(!actor.is_suspended, "Account is suspended.", {
    status: 403,
    code: "ACCOUNT_SUSPENDED",
  });

  return actor;
}

async function buildListingViews(listings: ListingRow[]): Promise<ListingWithFarmer[]> {
  if (!listings.length) {
    return [];
  }

  const supabase = createSupabaseServiceClient();
  const listingIds = listings.map((row) => row.id);
  const farmerIds = Array.from(new Set(listings.map((row) => row.farmer_id)));

  const [{ data: farmerRows, error: farmerError }, { data: photoRows, error: photoError }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email, role, phone, county, is_suspended, created_at, updated_at")
      .in("id", farmerIds),
    supabase.from("listing_photos").select("id, listing_id, storage_path, created_at").in("listing_id", listingIds),
  ]);

  assertSupabase(farmerError, "Failed to fetch farmer profiles.");
  assertSupabase(photoError, "Failed to fetch listing photos.");

  const farmerMap = new Map((farmerRows as ProfileRow[]).map((row) => [row.id, row]));
  const photosByListing = new Map<string, ListingPhotoRecord[]>();

  for (const row of (photoRows as ListingPhotoRow[])) {
    const mapped = toListingPhotoRecord(row);
    const existing = photosByListing.get(mapped.listingId) ?? [];
    existing.push(mapped);
    photosByListing.set(mapped.listingId, existing);
  }

  return listings.map((row) => {
    const farmer = farmerMap.get(row.farmer_id);
    assertOrThrow(farmer, "Farmer profile missing for listing.", {
      status: 500,
      code: "DATA_INTEGRITY",
    });

    return {
      ...toListingRecord(row),
      farmer: toPublicUser(farmer),
      photos: photosByListing.get(row.id) ?? [],
    };
  });
}

async function buildOrderViews(orders: OrderRow[]): Promise<OrderWithRelations[]> {
  if (!orders.length) {
    return [];
  }

  const supabase = createSupabaseServiceClient();

  const orderIds = orders.map((row) => row.id);
  const listingIds = Array.from(new Set(orders.map((row) => row.listing_id)));
  const userIds = Array.from(
    new Set([
      ...orders.map((row) => row.buyer_id),
      ...orders.map((row) => row.farmer_id),
    ]),
  );

  const [{ data: listingRows, error: listingError }, { data: profileRows, error: profileError }, { data: paymentRows, error: paymentError }] = await Promise.all([
    supabase
      .from("listings")
      .select("id, farmer_id, product_name, category, quantity, unit, price_kes, location, description, status, created_at, updated_at")
      .in("id", listingIds),
    supabase
      .from("profiles")
      .select("id, full_name, email, role, phone, county, is_suspended, created_at, updated_at")
      .in("id", userIds),
    supabase
      .from("payments")
      .select("id, order_id, amount_kes, status, merchant_request_id, checkout_request_id, mpesa_receipt_number, transaction_date, phone_number, raw_callback, created_at, updated_at")
      .in("order_id", orderIds),
  ]);

  assertSupabase(listingError, "Failed to fetch order listings.");
  assertSupabase(profileError, "Failed to fetch order profiles.");
  assertSupabase(paymentError, "Failed to fetch order payments.");

  const listingMap = new Map((listingRows as ListingRow[]).map((row) => [row.id, toListingRecord(row)]));
  const profileMap = new Map((profileRows as ProfileRow[]).map((row) => [row.id, toPublicUser(row)]));
  const paymentMap = new Map((paymentRows as PaymentRow[]).map((row) => [row.order_id, toPaymentRecord(row)]));

  return orders.map((row) => {
    const listing = listingMap.get(row.listing_id);
    const buyer = profileMap.get(row.buyer_id);
    const farmer = profileMap.get(row.farmer_id);

    assertOrThrow(listing && buyer && farmer, "Order relation missing.", {
      status: 500,
      code: "DATA_INTEGRITY",
    });

    return {
      ...toOrderRecord(row),
      listing,
      buyer,
      farmer,
      payment: paymentMap.get(row.id) ?? null,
    };
  });
}

async function getListingRowById(id: string): Promise<ListingRow | null> {
  const supabase = createSupabaseServiceClient();

  const { data, error } = await supabase
    .from("listings")
    .select("id, farmer_id, product_name, category, quantity, unit, price_kes, location, description, status, created_at, updated_at")
    .eq("id", id)
    .maybeSingle();

  assertSupabase(error, "Failed to fetch listing.");
  return (data as ListingRow | null) ?? null;
}

async function getOrderRowById(id: string): Promise<OrderRow | null> {
  const supabase = createSupabaseServiceClient();

  const { data, error } = await supabase
    .from("orders")
    .select("id, listing_id, buyer_id, farmer_id, quantity, unit_price_kes, total_kes, status, created_at, updated_at")
    .eq("id", id)
    .maybeSingle();

  assertSupabase(error, "Failed to fetch order.");
  return (data as OrderRow | null) ?? null;
}

function transitionOrderStatus(current: OrderStatus, action: "accept" | "reject" | "cancel"): OrderStatus {
  if (action === "accept") {
    assertOrThrow(current === "pending", "Only pending orders can be accepted.", {
      status: 400,
      code: "INVALID_STATE",
    });

    return "accepted";
  }

  if (action === "reject") {
    assertOrThrow(current === "pending", "Only pending orders can be rejected.", {
      status: 400,
      code: "INVALID_STATE",
    });

    return "rejected";
  }

  assertOrThrow(["pending", "accepted", "payment_pending"].includes(current), "Order cannot be cancelled in current state.", {
    status: 400,
    code: "INVALID_STATE",
  });

  return "cancelled";
}

function generateCheckoutRequestId() {
  return `ws_CO_${randomUUID().replace(/-/g, "").slice(0, 20)}`;
}

function generateMerchantRequestId() {
  return `MR_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

function darajaBaseUrl() {
  return process.env.DARAJA_BASE_URL?.trim() || "https://sandbox.safaricom.co.ke";
}

function isDarajaConfigured() {
  return Boolean(
    process.env.DARAJA_CONSUMER_KEY &&
      process.env.DARAJA_CONSUMER_SECRET &&
      process.env.DARAJA_PASSKEY &&
      process.env.DARAJA_SHORTCODE,
  );
}

function formatDarajaTimestamp(date = new Date()) {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  const second = String(date.getSeconds()).padStart(2, "0");
  return `${year}${month}${day}${hour}${minute}${second}`;
}

async function getDarajaAccessToken() {
  const consumerKey = process.env.DARAJA_CONSUMER_KEY;
  const consumerSecret = process.env.DARAJA_CONSUMER_SECRET;
  assertOrThrow(consumerKey && consumerSecret, "Daraja OAuth credentials are not configured.", {
    status: 500,
    code: "DARAJA_CONFIG_ERROR",
  });

  const basicAuth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
  const response = await fetch(`${darajaBaseUrl()}/oauth/v1/generate?grant_type=client_credentials`, {
    method: "GET",
    headers: {
      Authorization: `Basic ${basicAuth}`,
    },
  });

  assertOrThrow(response.ok, "Failed to fetch Daraja OAuth token.", {
    status: 502,
    code: "DARAJA_OAUTH_ERROR",
  });

  const body = await response.json();
  assertOrThrow(body?.access_token, "Daraja OAuth response missing access token.", {
    status: 502,
    code: "DARAJA_OAUTH_ERROR",
  });

  return body.access_token as string;
}

async function initiateDarajaStkPush(input: {
  amountKes: number;
  phoneNumber: string;
  orderId: string;
}) {
  const passkey = process.env.DARAJA_PASSKEY;
  const shortcode = process.env.DARAJA_SHORTCODE;
  assertOrThrow(passkey && shortcode, "Daraja STK credentials are not configured.", {
    status: 500,
    code: "DARAJA_CONFIG_ERROR",
  });

  const timestamp = formatDarajaTimestamp();
  const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString("base64");
  const callbackUrl = process.env.DARAJA_CALLBACK_URL
    ? process.env.DARAJA_CALLBACK_URL.trim()
    : `${(process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "")}/api/payments/callback`;

  assertOrThrow(/^https?:\/\//.test(callbackUrl), "DARAJA_CALLBACK_URL or NEXT_PUBLIC_APP_URL must be configured.", {
    status: 500,
    code: "DARAJA_CONFIG_ERROR",
  });

  const token = await getDarajaAccessToken();
  const response = await fetch(`${darajaBaseUrl()}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: Math.round(input.amountKes),
      PartyA: input.phoneNumber,
      PartyB: shortcode,
      PhoneNumber: input.phoneNumber,
      CallBackURL: callbackUrl,
      AccountReference: `ORDER-${input.orderId.slice(0, 8)}`,
      TransactionDesc: "Mkulima Connect order payment",
    }),
  });

  const body = await response.json().catch(() => ({}));
  assertOrThrow(response.ok, "Daraja STK initiation failed.", {
    status: 502,
    code: "DARAJA_STK_ERROR",
    details: body,
  });

  assertOrThrow(body?.CheckoutRequestID && body?.MerchantRequestID, "Daraja STK response is incomplete.", {
    status: 502,
    code: "DARAJA_STK_ERROR",
    details: body,
  });

  return {
    checkoutRequestId: body.CheckoutRequestID as string,
    merchantRequestId: body.MerchantRequestID as string,
  };
}

function randomReceipt() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const letters = Array.from({ length: 2 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
  const digits = `${Math.floor(100000 + Math.random() * 900000)}`;
  return `${letters}${digits}`;
}

async function waitForProfile(userId: string) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const profile = await getProfileById(userId);
    if (profile) {
      return profile;
    }

    await sleep(120);
  }

  return null;
}

async function provisionProfileFallback(input: {
  userId: string;
  fullName: string;
  email: string;
  role: "buyer" | "farmer";
  phone?: string;
  county?: string;
}) {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: input.userId,
        full_name: input.fullName,
        email: input.email,
        role: input.role,
        phone: input.phone ? cleanText(input.phone) : null,
        county: input.county ? cleanText(input.county) : null,
      },
      { onConflict: "id" },
    );

  assertSupabase(error, "Failed to provision profile fallback.");
}

export async function registerUser(input: {
  fullName: string;
  email: string;
  password: string;
  role: Role;
  phone?: string;
  county?: string;
}): Promise<{ user: PublicUser; session: AuthSessionPayload }> {
  const fullName = cleanText(input.fullName);
  const email = normalizeEmail(input.email);
  const password = input.password;

  requireNonEmpty(fullName, "Full name");
  requireNonEmpty(email, "Email");
  assertOrThrow(/^\S+@\S+\.\S+$/.test(email), "Email format is invalid.", {
    status: 400,
    code: "VALIDATION_ERROR",
  });
  assertOrThrow(["farmer", "buyer"].includes(input.role), "Invalid role.", {
    status: 400,
    code: "VALIDATION_ERROR",
  });
  assertOrThrow(isPasswordStrong(password), "Password must include uppercase, lowercase and number with at least 8 characters.", {
    status: 400,
    code: "VALIDATION_ERROR",
  });

  const anon = createSupabaseAnonClient();

  const { data: signUpData, error: signUpError } = await anon.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role: input.role,
        phone: input.phone ? cleanText(input.phone) : null,
        county: input.county ? cleanText(input.county) : null,
      },
    },
  });

  if (signUpError) {
    const rawMessage = signUpError.message || "Sign up failed.";
    if (rawMessage.toLowerCase().includes("database error saving new user")) {
      throw new AppError(
        "Registration failed because Supabase auth profile trigger is misconfigured. Apply latest migrations and retry.",
        {
          status: 500,
          code: "AUTH_SIGNUP_BACKEND_ERROR",
          details: { message: rawMessage },
        },
      );
    }

    const code = signUpError.message.toLowerCase().includes("already")
      ? "DUPLICATE_EMAIL"
      : "AUTH_SIGNUP_ERROR";
    throw new AppError(rawMessage, {
      status: code === "DUPLICATE_EMAIL" ? 409 : 400,
      code,
    });
  }

  assertOrThrow(signUpData.user, "Sign up did not return user data.", {
    status: 500,
    code: "AUTH_SIGNUP_ERROR",
  });

  let session = signUpData.session ?? null;
  if (!session) {
    const { data: loginData, error: loginError } = await anon.auth.signInWithPassword({
      email,
      password,
    });

    if (loginError || !loginData.session) {
      throw new AppError("Registration succeeded but automatic login failed. Verify email then login manually.", {
        status: 409,
        code: "SESSION_NOT_AVAILABLE",
      });
    }

    session = loginData.session;
  }

  let profile = await waitForProfile(signUpData.user.id);
  if (!profile) {
    await provisionProfileFallback({
      userId: signUpData.user.id,
      fullName,
      email,
      role: input.role as "buyer" | "farmer",
      phone: input.phone,
      county: input.county,
    });
    profile = await waitForProfile(signUpData.user.id);
  }

  assertOrThrow(profile, "Profile was not provisioned. Ensure auth trigger is deployed.", {
    status: 500,
    code: "PROFILE_PROVISION_ERROR",
  });

  return {
    user: toPublicUser(profile),
    session: extractSessionPayload(session),
  };
}

export async function updateProfile(input: {
  userId: string;
  fullName: string;
  phone?: string;
  county?: string;
}) {
  const fullName = cleanText(input.fullName);
  requireNonEmpty(fullName, "Full name");

  const supabase = createSupabaseServiceClient();

  const { data, error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      phone: input.phone ? cleanText(input.phone) : null,
      county: input.county ? cleanText(input.county) : null,
    })
    .eq("id", input.userId)
    .select("id, full_name, email, role, phone, county, is_suspended, created_at, updated_at")
    .single();

  assertSupabase(error, "Failed to update profile.");
  return toPublicUser(data as ProfileRow);
}

export async function getListings(filters?: {
  search?: string;
  location?: string;
  minPrice?: string;
  maxPrice?: string;
  sort?: string;
  includeInactiveForFarmerId?: string;
  limit?: string | number;
  offset?: string | number;
}) {
  const supabase = createSupabaseServiceClient();

  let query = supabase
    .from("listings")
    .select("id, farmer_id, product_name, category, quantity, unit, price_kes, location, description, status, created_at, updated_at");

  if (filters?.includeInactiveForFarmerId) {
    query = query.or(`status.eq.active,farmer_id.eq.${filters.includeInactiveForFarmerId}`);
  } else {
    query = query.eq("status", "active");
  }

  const { data, error } = await query;
  assertSupabase(error, "Failed to load listings.");

  let rows = (data as ListingRow[]) ?? [];

  if (filters?.search) {
    const search = filters.search.toLowerCase().trim();
    rows = rows.filter((row) =>
      row.product_name.toLowerCase().includes(search) ||
      (row.category ?? "").toLowerCase().includes(search) ||
      (row.description ?? "").toLowerCase().includes(search),
    );
  }

  if (filters?.location) {
    const location = filters.location.toLowerCase().trim();
    rows = rows.filter((row) => row.location.toLowerCase().includes(location));
  }

  const minPrice = filters?.minPrice ? Number(filters.minPrice) : null;
  if (minPrice !== null && Number.isFinite(minPrice)) {
    rows = rows.filter((row) => toNumber(row.price_kes) >= minPrice);
  }

  const maxPrice = filters?.maxPrice ? Number(filters.maxPrice) : null;
  if (maxPrice !== null && Number.isFinite(maxPrice)) {
    rows = rows.filter((row) => toNumber(row.price_kes) <= maxPrice);
  }

  switch (filters?.sort) {
    case "price_asc":
      rows.sort((a, b) => toNumber(a.price_kes) - toNumber(b.price_kes));
      break;
    case "price_desc":
      rows.sort((a, b) => toNumber(b.price_kes) - toNumber(a.price_kes));
      break;
    case "latest":
      rows.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      break;
    default:
      rows.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      break;
  }

  const parsedOffset = Number(filters?.offset ?? 0);
  const parsedLimit = Number(filters?.limit ?? 20);
  const offset = Number.isFinite(parsedOffset) && parsedOffset >= 0 ? Math.floor(parsedOffset) : 0;
  const limit = Number.isFinite(parsedLimit) && parsedLimit > 0
    ? Math.min(100, Math.floor(parsedLimit))
    : 20;
  rows = rows.slice(offset, offset + limit);

  return buildListingViews(rows);
}

export async function getListingById(id: string) {
  const row = await getListingRowById(id);
  assertOrThrow(row, "Listing not found.", {
    status: 404,
    code: "NOT_FOUND",
  });

  const [listing] = await buildListingViews([row]);
  return listing;
}

export async function getFarmerListings(farmerId: string) {
  const supabase = createSupabaseServiceClient();

  const { data, error } = await supabase
    .from("listings")
    .select("id, farmer_id, product_name, category, quantity, unit, price_kes, location, description, status, created_at, updated_at")
    .eq("farmer_id", farmerId)
    .order("updated_at", { ascending: false });

  assertSupabase(error, "Failed to fetch farmer listings.");
  return buildListingViews((data as ListingRow[]) ?? []);
}

export async function createListing(input: {
  farmerId: string;
  productName: string;
  category?: string;
  quantity: string | number;
  unit: string;
  priceKes: string | number;
  location: string;
  description?: string;
  imageUrls?: string[];
}) {
  const productName = cleanText(input.productName);
  const unit = cleanText(input.unit);
  const location = cleanText(input.location);

  requireNonEmpty(productName, "Product name");
  requireNonEmpty(unit, "Unit");
  requireNonEmpty(location, "Location");

  const quantity = parsePositiveNumber(input.quantity, "Quantity");
  const priceKes = parsePositiveNumber(input.priceKes, "Price");

  const farmer = await ensureActor(input.farmerId);
  assertOrThrow(farmer.role === "farmer" || farmer.role === "admin", "Only farmers can create listings.", {
    status: 403,
    code: "FORBIDDEN",
  });

  const supabase = createSupabaseServiceClient();

  const { data, error } = await supabase
    .from("listings")
    .insert({
      farmer_id: input.farmerId,
      product_name: productName,
      category: input.category ? cleanText(input.category) : null,
      quantity,
      unit,
      price_kes: priceKes,
      location,
      description: input.description ? cleanText(input.description) : null,
      status: "active",
    })
    .select("id, farmer_id, product_name, category, quantity, unit, price_kes, location, description, status, created_at, updated_at")
    .single();

  assertSupabase(error, "Failed to create listing.");
  const listing = data as ListingRow;

  const storagePaths = (input.imageUrls ?? []).map((value) => cleanText(value)).filter(Boolean);
  if (storagePaths.length) {
    const photoInsert = storagePaths.map((path) => ({
      listing_id: listing.id,
      storage_path: path,
    }));

    const { error: photoError } = await supabase.from("listing_photos").insert(photoInsert);
    assertSupabase(photoError, "Failed to save listing photos.");
  }

  const [view] = await buildListingViews([listing]);
  return view;
}

export async function updateListing(input: {
  listingId: string;
  actorId: string;
  productName: string;
  category?: string;
  quantity: string | number;
  unit: string;
  priceKes: string | number;
  location: string;
  description?: string;
  status?: ListingStatus;
}) {
  const productName = cleanText(input.productName);
  const unit = cleanText(input.unit);
  const location = cleanText(input.location);

  requireNonEmpty(productName, "Product name");
  requireNonEmpty(unit, "Unit");
  requireNonEmpty(location, "Location");

  const quantity = parsePositiveNumber(input.quantity, "Quantity");
  const priceKes = parsePositiveNumber(input.priceKes, "Price");

  const [listing, actor] = await Promise.all([
    getListingRowById(input.listingId),
    ensureActor(input.actorId),
  ]);

  assertOrThrow(listing, "Listing not found.", {
    status: 404,
    code: "NOT_FOUND",
  });

  const canEdit = actor.role === "admin" || listing.farmer_id === actor.id;
  assertOrThrow(canEdit, "You cannot edit this listing.", {
    status: 403,
    code: "FORBIDDEN",
  });

  const supabase = createSupabaseServiceClient();

  const { data, error } = await supabase
    .from("listings")
    .update({
      product_name: productName,
      category: input.category ? cleanText(input.category) : null,
      quantity,
      unit,
      price_kes: priceKes,
      location,
      description: input.description ? cleanText(input.description) : null,
      status: input.status,
    })
    .eq("id", input.listingId)
    .select("id, farmer_id, product_name, category, quantity, unit, price_kes, location, description, status, created_at, updated_at")
    .single();

  assertSupabase(error, "Failed to update listing.");
  const [view] = await buildListingViews([data as ListingRow]);
  return view;
}

export async function setListingStatus(input: {
  listingId: string;
  actorId: string;
  status: ListingStatus;
}) {
  const [listing, actor] = await Promise.all([
    getListingRowById(input.listingId),
    ensureActor(input.actorId),
  ]);

  assertOrThrow(listing, "Listing not found.", {
    status: 404,
    code: "NOT_FOUND",
  });

  const canEdit = actor.role === "admin" || listing.farmer_id === actor.id;
  assertOrThrow(canEdit, "You cannot update this listing.", {
    status: 403,
    code: "FORBIDDEN",
  });

  const supabase = createSupabaseServiceClient();

  const { data, error } = await supabase
    .from("listings")
    .update({ status: input.status })
    .eq("id", input.listingId)
    .select("id, farmer_id, product_name, category, quantity, unit, price_kes, location, description, status, created_at, updated_at")
    .single();

  assertSupabase(error, "Failed to update listing status.");
  const [view] = await buildListingViews([data as ListingRow]);
  return view;
}

export async function deleteListing(input: {
  listingId: string;
  actorId: string;
  reason?: string;
}) {
  const [listing, actor] = await Promise.all([
    getListingRowById(input.listingId),
    ensureActor(input.actorId),
  ]);

  assertOrThrow(listing, "Listing not found.", {
    status: 404,
    code: "NOT_FOUND",
  });

  const canEdit = actor.role === "admin" || listing.farmer_id === actor.id;
  assertOrThrow(canEdit, "You cannot delete this listing.", {
    status: 403,
    code: "FORBIDDEN",
  });

  const supabase = createSupabaseServiceClient();

  const { data, error } = await supabase
    .from("listings")
    .update({ status: "archived" })
    .eq("id", input.listingId)
    .select("id, farmer_id, product_name, category, quantity, unit, price_kes, location, description, status, created_at, updated_at")
    .single();

  assertSupabase(error, "Failed to archive listing.");

  if (actor.role === "admin") {
    const { error: logError } = await supabase.from("admin_audit_logs").insert({
      admin_id: actor.id,
      action: "remove_listing",
      target_table: "listings",
      target_id: input.listingId,
      note: input.reason ? cleanText(input.reason) : null,
    });

    assertSupabase(logError, "Failed to create admin audit log.");
  }

  return toListingRecord(data as ListingRow);
}

export async function createOrder(input: {
  buyerId: string;
  listingId: string;
  quantity: string | number;
}) {
  const quantity = parsePositiveNumber(input.quantity, "Quantity");

  const [buyer, listing] = await Promise.all([
    ensureActor(input.buyerId),
    getListingRowById(input.listingId),
  ]);

  assertOrThrow(buyer.role === "buyer", "Only buyers can place orders.", {
    status: 403,
    code: "FORBIDDEN",
  });

  assertOrThrow(listing, "Listing not found.", {
    status: 404,
    code: "NOT_FOUND",
  });

  assertOrThrow(listing.status === "active", "Listing is not active.", {
    status: 400,
    code: "INVALID_STATE",
  });

  assertOrThrow(quantity <= toNumber(listing.quantity), "Requested quantity exceeds available stock.", {
    status: 400,
    code: "INSUFFICIENT_STOCK",
  });

  const supabase = createSupabaseServiceClient();

  const { data, error } = await supabase
    .from("orders")
    .insert({
      listing_id: listing.id,
      buyer_id: buyer.id,
      farmer_id: listing.farmer_id,
      quantity,
      unit_price_kes: toNumber(listing.price_kes),
      total_kes: quantity * toNumber(listing.price_kes),
      status: "pending",
    })
    .select("id, listing_id, buyer_id, farmer_id, quantity, unit_price_kes, total_kes, status, created_at, updated_at")
    .single();

  assertSupabase(error, "Failed to create order.");

  const { error: notifError } = await supabase.from("notifications").insert({
    recipient_id: listing.farmer_id,
    title: "New Order Received",
    message: `A buyer placed an order for ${quantity} ${listing.unit} of ${listing.product_name}.`,
    type: "order",
  });

  assertSupabase(notifError, "Failed to create order notification.");

  const [view] = await buildOrderViews([data as OrderRow]);
  return view;
}

export async function updateOrderStatus(input: {
  orderId: string;
  actorId: string;
  action: "accept" | "reject" | "cancel";
}) {
  const [order, actor] = await Promise.all([
    getOrderRowById(input.orderId),
    ensureActor(input.actorId),
  ]);

  assertOrThrow(order, "Order not found.", {
    status: 404,
    code: "NOT_FOUND",
  });

  if (input.action === "accept" || input.action === "reject") {
    assertOrThrow(actor.id === order.farmer_id || actor.role === "admin", "Only farmer can review this order.", {
      status: 403,
      code: "FORBIDDEN",
    });
  }

  if (input.action === "cancel") {
    assertOrThrow(actor.id === order.buyer_id || actor.role === "admin", "Only buyer can cancel this order.", {
      status: 403,
      code: "FORBIDDEN",
    });
  }

  if (input.action === "accept") {
    const listing = await getListingRowById(order.listing_id);
    assertOrThrow(listing, "Listing not found for this order.", {
      status: 404,
      code: "NOT_FOUND",
    });
    assertOrThrow(listing.status === "active", "Listing is not active.", {
      status: 400,
      code: "INVALID_STATE",
    });
    assertOrThrow(toNumber(order.quantity) <= toNumber(listing.quantity), "Insufficient stock to accept this order.", {
      status: 409,
      code: "INSUFFICIENT_STOCK",
    });
  }

  const nextStatus = transitionOrderStatus(order.status, input.action);
  const supabase = createSupabaseServiceClient();

  const { data, error } = await supabase
    .from("orders")
    .update({ status: nextStatus })
    .eq("id", input.orderId)
    .select("id, listing_id, buyer_id, farmer_id, quantity, unit_price_kes, total_kes, status, created_at, updated_at")
    .single();

  assertSupabase(error, "Failed to update order status.");

  const freshOrder = data as OrderRow;
  const listing = await getListingRowById(freshOrder.listing_id);

  if (nextStatus === "accepted") {
    const { error: notifError } = await supabase.from("notifications").insert({
      recipient_id: freshOrder.buyer_id,
      title: "Order Accepted",
      message: `${actor.full_name} accepted your order for ${listing?.product_name ?? "produce"}. Proceed to payment.`,
      type: "order",
    });

    assertSupabase(notifError, "Failed to create acceptance notification.");
  }

  if (nextStatus === "rejected") {
    const { error: notifError } = await supabase.from("notifications").insert({
      recipient_id: freshOrder.buyer_id,
      title: "Order Rejected",
      message: `${actor.full_name} rejected your order for ${listing?.product_name ?? "produce"}.`,
      type: "order",
    });

    assertSupabase(notifError, "Failed to create rejection notification.");
  }

  if (nextStatus === "cancelled") {
    const { error: notifError } = await supabase.from("notifications").insert({
      recipient_id: freshOrder.farmer_id,
      title: "Order Cancelled",
      message: `${actor.full_name} cancelled order ${freshOrder.id.slice(0, 8)}.`,
      type: "order",
    });

    assertSupabase(notifError, "Failed to create cancellation notification.");
  }

  const [view] = await buildOrderViews([freshOrder]);
  return view;
}

export async function getOrdersForUser(input: { userId: string; role: Role }) {
  const supabase = createSupabaseServiceClient();

  let query = supabase
    .from("orders")
    .select("id, listing_id, buyer_id, farmer_id, quantity, unit_price_kes, total_kes, status, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (input.role === "buyer") {
    query = query.eq("buyer_id", input.userId);
  }

  if (input.role === "farmer") {
    query = query.eq("farmer_id", input.userId);
  }

  const { data, error } = await query;
  assertSupabase(error, "Failed to load orders.");

  return buildOrderViews((data as OrderRow[]) ?? []);
}

export async function getOrderById(orderId: string) {
  const row = await getOrderRowById(orderId);
  assertOrThrow(row, "Order not found.", {
    status: 404,
    code: "NOT_FOUND",
  });

  const [view] = await buildOrderViews([row]);
  return view;
}

export async function initiatePayment(input: {
  orderId: string;
  buyerId: string;
  phoneNumber: string;
}) {
  const phoneNumber = cleanText(input.phoneNumber);
  assertOrThrow(/^2547\d{8}$/.test(phoneNumber), "Phone number must be in format 2547XXXXXXXX.", {
    status: 400,
    code: "VALIDATION_ERROR",
  });

  const [buyer, order] = await Promise.all([
    ensureActor(input.buyerId),
    getOrderRowById(input.orderId),
  ]);

  assertOrThrow(order, "Order not found.", {
    status: 404,
    code: "NOT_FOUND",
  });

  assertOrThrow(order.buyer_id === buyer.id || buyer.role === "admin", "Only the buyer can initiate payment.", {
    status: 403,
    code: "FORBIDDEN",
  });

  assertOrThrow(order.status === "accepted", "Order must be accepted before payment.", {
    status: 400,
    code: "INVALID_STATE",
  });

  const supabase = createSupabaseServiceClient();

  const { data: existingPaymentData, error: existingPaymentError } = await supabase
    .from("payments")
    .select("id, order_id, amount_kes, status, merchant_request_id, checkout_request_id, mpesa_receipt_number, transaction_date, phone_number, raw_callback, created_at, updated_at")
    .eq("order_id", order.id)
    .maybeSingle();

  assertSupabase(existingPaymentError, "Failed to check existing payment.");

  const existing = (existingPaymentData as PaymentRow | null) ?? null;
  assertOrThrow(!existing || ["failed", "reversed"].includes(existing.status), "Payment already exists for this order.", {
    status: 409,
    code: "DUPLICATE_PAYMENT",
  });

  const requestIds = isDarajaConfigured()
    ? await initiateDarajaStkPush({
      amountKes: toNumber(order.total_kes),
      phoneNumber,
      orderId: order.id,
    })
    : {
      checkoutRequestId: generateCheckoutRequestId(),
      merchantRequestId: generateMerchantRequestId(),
    };

  const { data: paymentData, error: paymentError } = await supabase
    .from("payments")
    .upsert(
      {
        order_id: order.id,
        amount_kes: toNumber(order.total_kes),
        status: "pending",
        merchant_request_id: requestIds.merchantRequestId,
        checkout_request_id: requestIds.checkoutRequestId,
        phone_number: phoneNumber,
      },
      { onConflict: "order_id" },
    )
    .select("id, order_id, amount_kes, status, merchant_request_id, checkout_request_id, mpesa_receipt_number, transaction_date, phone_number, raw_callback, created_at, updated_at")
    .single();

  assertSupabase(paymentError, "Failed to initiate payment.");

  const { data: updatedOrderData, error: orderError } = await supabase
    .from("orders")
    .update({ status: "payment_pending" })
    .eq("id", order.id)
    .select("id, listing_id, buyer_id, farmer_id, quantity, unit_price_kes, total_kes, status, created_at, updated_at")
    .single();

  assertSupabase(orderError, "Failed to update order payment state.");

  return {
    payment: toPaymentRecord(paymentData as PaymentRow),
    order: toOrderRecord(updatedOrderData as OrderRow),
    message: "STK push initiated.",
  };
}

export async function processPaymentCallback(input: {
  checkoutRequestId: string;
  resultCode: number;
  resultDesc: string;
  mpesaReceiptNumber?: string;
  transactionDate?: string;
  phoneNumber?: string;
  payload?: unknown;
}) {
  const checkoutRequestId = cleanText(input.checkoutRequestId);
  requireNonEmpty(checkoutRequestId, "checkoutRequestId");

  const supabase = createSupabaseServiceClient();

  const { data: paymentData, error: paymentError } = await supabase
    .from("payments")
    .select("id, order_id, amount_kes, status, merchant_request_id, checkout_request_id, mpesa_receipt_number, transaction_date, phone_number, raw_callback, created_at, updated_at")
    .eq("checkout_request_id", checkoutRequestId)
    .maybeSingle();

  assertSupabase(paymentError, "Failed to fetch payment callback target.");

  const payment = (paymentData as PaymentRow | null) ?? null;
  assertOrThrow(payment, "Payment record not found for callback.", {
    status: 404,
    code: "NOT_FOUND",
  });

  if (["success", "failed", "reversed"].includes(payment.status)) {
    return {
      idempotent: true,
      payment: toPaymentRecord(payment),
    };
  }

  const { data: orderData, error: orderError } = await supabase
    .from("orders")
    .select("id, listing_id, buyer_id, farmer_id, quantity, unit_price_kes, total_kes, status, created_at, updated_at")
    .eq("id", payment.order_id)
    .single();

  assertSupabase(orderError, "Failed to fetch order for payment callback.");
  const order = orderData as OrderRow;

  const successful = input.resultCode === 0;

  const { data: updatedPaymentData, error: updatedPaymentError } = await supabase
    .from("payments")
    .update({
      status: successful ? "success" : "failed",
      mpesa_receipt_number: successful
        ? cleanText(input.mpesaReceiptNumber ?? "") || randomReceipt()
        : null,
      transaction_date: successful
        ? input.transactionDate ?? nowIso()
        : null,
      phone_number: successful
        ? cleanText(input.phoneNumber ?? "") || payment.phone_number
        : payment.phone_number,
      raw_callback: input.payload ?? {
        resultCode: input.resultCode,
        resultDesc: input.resultDesc,
      },
    })
    .eq("id", payment.id)
    .select("id, order_id, amount_kes, status, merchant_request_id, checkout_request_id, mpesa_receipt_number, transaction_date, phone_number, raw_callback, created_at, updated_at")
    .single();

  assertSupabase(updatedPaymentError, "Failed to update payment callback state.");

  const nextOrderStatus: OrderStatus = successful ? "paid" : "accepted";
  const { data: updatedOrderData, error: updatedOrderError } = await supabase
    .from("orders")
    .update({ status: nextOrderStatus })
    .eq("id", order.id)
    .select("id, listing_id, buyer_id, farmer_id, quantity, unit_price_kes, total_kes, status, created_at, updated_at")
    .single();

  assertSupabase(updatedOrderError, "Failed to update order after payment callback.");
  const updatedOrder = updatedOrderData as OrderRow;

  if (successful) {
    const { data: stockData, error: stockError } = await supabase.rpc("consume_listing_stock", {
      p_listing_id: order.listing_id,
      p_quantity: toNumber(order.quantity),
    });
    assertSupabase(stockError, "Failed to update listing stock after payment.");

    const stockRow = ((stockData as Array<{ applied: boolean }> | null) ?? [])[0];
    assertOrThrow(stockRow?.applied === true, "Unable to apply stock deduction for this payment.", {
      status: 409,
      code: "INSUFFICIENT_STOCK",
    });

    const { error: notifError } = await supabase.from("notifications").insert([
      {
        recipient_id: order.buyer_id,
        title: "Payment Confirmed",
        message: `Payment for order ${order.id.slice(0, 8)} confirmed successfully.`,
        type: "payment",
      },
      {
        recipient_id: order.farmer_id,
        title: "Order Paid",
        message: `Buyer paid order ${order.id.slice(0, 8)}. Prepare fulfilment.`,
        type: "payment",
      },
    ]);

    assertSupabase(notifError, "Failed to create payment success notifications.");
  } else {
    const { error: notifError } = await supabase.from("notifications").insert({
      recipient_id: order.buyer_id,
      title: "Payment Failed",
      message: `Payment attempt failed: ${input.resultDesc}`,
      type: "payment",
    });

    assertSupabase(notifError, "Failed to create payment failure notification.");
  }

  return {
    idempotent: false,
    payment: toPaymentRecord(updatedPaymentData as PaymentRow),
    order: toOrderRecord(updatedOrder),
  };
}

export async function getNotificationsForUser(userId: string) {
  const supabase = createSupabaseServiceClient();

  const { data, error } = await supabase
    .from("notifications")
    .select("id, recipient_id, title, message, type, is_read, created_at")
    .eq("recipient_id", userId)
    .order("created_at", { ascending: false });

  assertSupabase(error, "Failed to load notifications.");

  return ((data as NotificationRow[]) ?? []).map(toNotificationRecord);
}

export async function markNotificationRead(input: {
  userId: string;
  notificationId: string;
}) {
  const [actor, notificationRows] = await Promise.all([
    ensureActor(input.userId),
    createSupabaseServiceClient()
      .from("notifications")
      .select("id, recipient_id, title, message, type, is_read, created_at")
      .eq("id", input.notificationId)
      .limit(1),
  ]);

  const { data, error } = notificationRows;
  assertSupabase(error, "Failed to load notification.");

  const notification = ((data as NotificationRow[]) ?? [])[0] ?? null;
  assertOrThrow(notification, "Notification not found.", {
    status: 404,
    code: "NOT_FOUND",
  });

  assertOrThrow(notification.recipient_id === actor.id || actor.role === "admin", "Cannot modify this notification.", {
    status: 403,
    code: "FORBIDDEN",
  });

  const supabase = createSupabaseServiceClient();
  const { data: updatedData, error: updateError } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", input.notificationId)
    .select("id, recipient_id, title, message, type, is_read, created_at")
    .single();

  assertSupabase(updateError, "Failed to mark notification as read.");
  return toNotificationRecord(updatedData as NotificationRow);
}

export async function createNotification(input: {
  recipientId: string;
  title: string;
  message: string;
  type: NotificationType;
}) {
  const title = cleanText(input.title);
  const message = cleanText(input.message);

  requireNonEmpty(title, "Title");
  requireNonEmpty(message, "Message");

  const recipient = await getProfileById(input.recipientId);
  assertOrThrow(recipient, "Recipient not found.", {
    status: 404,
    code: "NOT_FOUND",
  });

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("notifications")
    .insert({
      recipient_id: input.recipientId,
      title,
      message,
      type: input.type,
    })
    .select("id, recipient_id, title, message, type, is_read, created_at")
    .single();

  assertSupabase(error, "Failed to create notification.");
  return toNotificationRecord(data as NotificationRow);
}

export async function getDashboardSnapshot(input: {
  userId: string;
  role: Role;
}): Promise<DashboardSnapshot> {
  const supabase = createSupabaseServiceClient();

  const { data, error } = await supabase.rpc("dashboard_snapshot", {
    p_user_id: input.userId,
  });

  assertSupabase(error, "Failed to load dashboard snapshot.");

  const row = ((data as Array<Record<string, unknown>>) ?? [])[0] ?? null;
  if (!row) {
    return {
      activeListings: 0,
      pendingOrders: 0,
      completedOrders: 0,
      totalRevenueKes: 0,
      unreadNotifications: 0,
    };
  }

  return {
    activeListings: toNumber(row.active_listings as number | string | undefined),
    pendingOrders: toNumber(row.pending_orders as number | string | undefined),
    completedOrders: toNumber(row.completed_orders as number | string | undefined),
    totalRevenueKes: toNumber(row.total_revenue_kes as number | string | undefined),
    unreadNotifications: toNumber(row.unread_notifications as number | string | undefined),
  };
}

export async function getAllUsers(actorId: string) {
  const actor = await ensureActor(actorId);
  assertOrThrow(actor.role === "admin", "Admin access required.", {
    status: 403,
    code: "FORBIDDEN",
  });

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, phone, county, is_suspended, created_at, updated_at")
    .order("created_at", { ascending: false });

  assertSupabase(error, "Failed to load users.");

  return ((data as ProfileRow[]) ?? []).map(toPublicUser);
}

export async function suspendUser(input: {
  adminId: string;
  targetUserId: string;
  suspend: boolean;
  note?: string;
}) {
  const admin = await ensureActor(input.adminId);
  assertOrThrow(admin.role === "admin", "Admin access required.", {
    status: 403,
    code: "FORBIDDEN",
  });

  assertOrThrow(input.targetUserId !== admin.id, "You cannot suspend your own account.", {
    status: 400,
    code: "INVALID_OPERATION",
  });

  const supabase = createSupabaseServiceClient();

  const { data, error } = await supabase
    .from("profiles")
    .update({ is_suspended: input.suspend })
    .eq("id", input.targetUserId)
    .select("id, full_name, email, role, phone, county, is_suspended, created_at, updated_at")
    .single();

  assertSupabase(error, "Failed to update user suspension.");

  const { error: logError } = await supabase.from("admin_audit_logs").insert({
    admin_id: admin.id,
    action: input.suspend ? "suspend_user" : "activate_user",
    target_table: "profiles",
    target_id: input.targetUserId,
    note: input.note ? cleanText(input.note) : null,
  });

  assertSupabase(logError, "Failed to write admin audit log.");

  return toPublicUser(data as ProfileRow);
}

export async function getAdminReports(adminId: string) {
  const admin = await ensureActor(adminId);
  assertOrThrow(admin.role === "admin", "Admin access required.", {
    status: 403,
    code: "FORBIDDEN",
  });

  const supabase = createSupabaseServiceClient();

  const [
    usersRes,
    listingsRes,
    ordersRes,
    paymentsRes,
    logsRes,
    recentPaymentsRes,
  ] = await Promise.all([
    supabase.from("profiles").select("id, role"),
    supabase.from("listings").select("id, status"),
    supabase.from("orders").select("id, status"),
    supabase.from("payments").select("id, status, amount_kes"),
    supabase
      .from("admin_audit_logs")
      .select("id, admin_id, action, target_table, target_id, note, created_at")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("payments")
      .select("id, order_id, amount_kes, status, merchant_request_id, checkout_request_id, mpesa_receipt_number, transaction_date, phone_number, raw_callback, created_at, updated_at")
      .order("updated_at", { ascending: false })
      .limit(20),
  ]);

  assertSupabase(usersRes.error, "Failed to load users report.");
  assertSupabase(listingsRes.error, "Failed to load listings report.");
  assertSupabase(ordersRes.error, "Failed to load orders report.");
  assertSupabase(paymentsRes.error, "Failed to load payments report.");
  assertSupabase(logsRes.error, "Failed to load admin logs report.");
  assertSupabase(recentPaymentsRes.error, "Failed to load recent payments report.");

  const users = (usersRes.data as Array<{ id: string; role: Role }>) ?? [];
  const listings = (listingsRes.data as Array<{ id: string; status: ListingStatus }>) ?? [];
  const orders = (ordersRes.data as Array<{ id: string; status: OrderStatus }>) ?? [];
  const payments = (paymentsRes.data as Array<{ id: string; status: PaymentStatus; amount_kes: number | string }>) ?? [];

  return {
    summary: {
      totalUsers: users.length,
      totalFarmers: users.filter((user) => user.role === "farmer").length,
      totalBuyers: users.filter((user) => user.role === "buyer").length,
      activeListings: listings.filter((listing) => listing.status === "active").length,
      totalOrders: orders.length,
      paidOrders: orders.filter((order) => ["paid", "completed"].includes(order.status)).length,
      successfulPayments: payments.filter((payment) => payment.status === "success").length,
      failedPayments: payments.filter((payment) => payment.status === "failed").length,
      platformRevenueKes: payments
        .filter((payment) => payment.status === "success")
        .reduce((total, payment) => total + toNumber(payment.amount_kes), 0),
    },
    recentAuditLogs: ((logsRes.data as AdminAuditRow[]) ?? []).map(toAdminAuditRecord),
    recentPayments: ((recentPaymentsRes.data as PaymentRow[]) ?? []).map(toPaymentRecord),
  };
}

export async function getUsersByRole(role: Role) {
  const supabase = createSupabaseServiceClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, phone, county, is_suspended, created_at, updated_at")
    .eq("role", role)
    .order("created_at", { ascending: false });

  assertSupabase(error, "Failed to load users by role.");
  return ((data as ProfileRow[]) ?? []).map(toPublicUser);
}

export async function getAllListingsForAdmin(adminId: string) {
  const admin = await ensureActor(adminId);
  assertOrThrow(admin.role === "admin", "Admin access required.", {
    status: 403,
    code: "FORBIDDEN",
  });

  const supabase = createSupabaseServiceClient();

  const { data, error } = await supabase
    .from("listings")
    .select("id, farmer_id, product_name, category, quantity, unit, price_kes, location, description, status, created_at, updated_at")
    .order("updated_at", { ascending: false });

  assertSupabase(error, "Failed to load listings for admin.");
  return buildListingViews((data as ListingRow[]) ?? []);
}
