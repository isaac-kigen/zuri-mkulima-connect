import { afterEach, describe, expect, it } from "vitest";

import { requireVerifiedPaymentCallback } from "../../src/lib/security";

const originalToken = process.env.PAYMENT_CALLBACK_TOKEN;
const originalAllowList = process.env.PAYMENT_CALLBACK_ALLOWED_IPS;

afterEach(() => {
  process.env.PAYMENT_CALLBACK_TOKEN = originalToken;
  process.env.PAYMENT_CALLBACK_ALLOWED_IPS = originalAllowList;
});

describe("payment callback security", () => {
  it("accepts callback with valid token", () => {
    process.env.PAYMENT_CALLBACK_TOKEN = "secret-token";
    process.env.PAYMENT_CALLBACK_ALLOWED_IPS = "";

    expect(() =>
      requireVerifiedPaymentCallback(
        new Request("http://localhost/api/payments/callback", {
          method: "POST",
          headers: {
            "x-callback-token": "secret-token",
          },
        }),
      ),
    ).not.toThrow();
  });

  it("rejects callback with invalid token", () => {
    process.env.PAYMENT_CALLBACK_TOKEN = "secret-token";
    process.env.PAYMENT_CALLBACK_ALLOWED_IPS = "";

    expect(() =>
      requireVerifiedPaymentCallback(
        new Request("http://localhost/api/payments/callback", {
          method: "POST",
          headers: {
            "x-callback-token": "wrong-token",
          },
        }),
      ),
    ).toThrow();
  });

  it("accepts callback with valid token in query string", () => {
    process.env.PAYMENT_CALLBACK_TOKEN = "secret-token";
    process.env.PAYMENT_CALLBACK_ALLOWED_IPS = "";

    expect(() =>
      requireVerifiedPaymentCallback(
        new Request("http://localhost/api/payments/callback?token=secret-token", {
          method: "POST",
        }),
      ),
    ).not.toThrow();
  });
});
