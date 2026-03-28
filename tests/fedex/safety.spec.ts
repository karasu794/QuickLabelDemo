import { assertSafeUrl } from "@/lib/fedex/safety";
import { describe, it, expect } from "vitest";

describe("safety", () => {
  it("allows oauth & rate", () => {
    expect(() => assertSafeUrl("https://apis.fedex.com/oauth/token")).not.toThrow();
    expect(() => assertSafeUrl("https://apis.fedex.com/rate/v1/rates/quotes")).not.toThrow();
  });

  it("blocks ship & openship", () => {
    expect(() => assertSafeUrl("https://apis.fedex.com/ship/v1/shipments")).toThrow();
    expect(() => assertSafeUrl("https://apis.fedex.com/openship/v1/whatever")).toThrow();
  });

  it("blocks unknown (SAFE_MODE=rate-only)", () => {
    expect(() => assertSafeUrl("https://apis.fedex.com/some/other")).toThrow();
  });
});

