import { describe, expect, it } from "vitest";

import { AppError, handleApiError } from "../../src/lib/errors";

describe("error model", () => {
  it("returns standard payload for AppError", async () => {
    const response = handleApiError(new AppError("Quantity must be greater than zero", {
      status: 400,
      code: "VALIDATION_ERROR",
    }));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({
      status: "error",
      code: "VALIDATION_ERROR",
      message: "Quantity must be greater than zero",
    });
  });
});
