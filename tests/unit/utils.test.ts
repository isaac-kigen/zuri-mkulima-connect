import { describe, expect, it } from "vitest";

import { cleanText } from "../../src/lib/utils";

describe("utils", () => {
  it("normalizes whitespace", () => {
    expect(cleanText("  Fresh   tomatoes   from  Nakuru ")).toBe("Fresh tomatoes from Nakuru");
  });
});
