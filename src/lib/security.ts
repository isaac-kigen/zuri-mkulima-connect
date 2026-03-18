import { timingSafeEqual } from "node:crypto";

import { AppError, assertOrThrow } from "@/lib/errors";

type Bucket = {
  count: number;
  resetAt: number;
};

const rateLimitBuckets = new Map<string, Bucket>();

function parseIpList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function safeEquals(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function getRequestIp(request: Request) {
  const fromForwarded = request.headers.get("x-forwarded-for");
  if (fromForwarded) {
    const first = fromForwarded.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  return "unknown";
}

export function enforceRateLimit(input: {
  key: string;
  limit: number;
  windowMs: number;
}) {
  const now = Date.now();
  const existing = rateLimitBuckets.get(input.key);

  if (!existing || now >= existing.resetAt) {
    rateLimitBuckets.set(input.key, {
      count: 1,
      resetAt: now + input.windowMs,
    });
    return;
  }

  if (existing.count >= input.limit) {
    throw new AppError("Too many requests. Please try again shortly.", {
      status: 429,
      code: "RATE_LIMITED",
      details: {
        retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000),
      },
    });
  }

  existing.count += 1;
  rateLimitBuckets.set(input.key, existing);
}

export function requireVerifiedPaymentCallback(request: Request) {
  const expectedToken = process.env.PAYMENT_CALLBACK_TOKEN;
  const allowedIps = parseIpList(process.env.PAYMENT_CALLBACK_ALLOWED_IPS ?? "");
  assertOrThrow(expectedToken || allowedIps.length > 0, "Configure PAYMENT_CALLBACK_TOKEN and/or PAYMENT_CALLBACK_ALLOWED_IPS for payment callbacks.", {
    status: 500,
    code: "CONFIG_ERROR",
  });

  if (expectedToken) {
    const requestUrl = new URL(request.url);
    const providedToken = request.headers.get("x-callback-token") ?? requestUrl.searchParams.get("token");

    assertOrThrow(providedToken, "Missing callback token.", {
      status: 401,
      code: "CALLBACK_AUTH_REQUIRED",
    });
    assertOrThrow(safeEquals(providedToken, expectedToken), "Invalid callback token.", {
      status: 401,
      code: "CALLBACK_AUTH_INVALID",
    });
  }

  if (allowedIps.length > 0) {
    const ip = getRequestIp(request);
    assertOrThrow(allowedIps.includes(ip), "Callback origin is not allowed.", {
      status: 403,
      code: "CALLBACK_ORIGIN_FORBIDDEN",
      details: { ip },
    });
  }
}
