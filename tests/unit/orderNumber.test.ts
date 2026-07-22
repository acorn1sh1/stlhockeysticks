import { describe, expect, it } from "vitest";
import {
  formatOrderNumber,
  looksLikeOrderId,
  parseOrderNumber,
} from "@/lib/orderNumber";

describe("formatOrderNumber", () => {
  it("renders with the STL prefix", () => {
    expect(formatOrderNumber(1042)).toBe("STL-1042");
  });
});

describe("parseOrderNumber", () => {
  it("round-trips a formatted number", () => {
    expect(parseOrderNumber(formatOrderNumber(1042))).toBe(1042);
  });

  it("accepts the forms a customer actually types", () => {
    for (const input of [
      "STL-1042",
      "stl-1042",
      "STL 1042",
      "STL1042",
      "  STL-1042  ",
      "#STL-1042",
      "1042",
      " 1042 ",
    ]) {
      expect(parseOrderNumber(input)).toBe(1042);
    }
  });

  it("survives dashes and spaces mangled by email clients", () => {
    // en dash, em dash, minus sign, non-breaking space
    expect(parseOrderNumber("STL–1042")).toBe(1042);
    expect(parseOrderNumber("STL—1042")).toBe(1042);
    expect(parseOrderNumber("STL−1042")).toBe(1042);
    expect(parseOrderNumber("STL 1042")).toBe(1042);
  });

  it("rejects junk rather than guessing", () => {
    for (const input of ["", "   ", "STL-", "STL", "abc", "-5", "0", "12.5"]) {
      expect(parseOrderNumber(input)).toBe(null);
    }
  });

  it("rejects trailing garbage instead of silently truncating", () => {
    // Parsing "1042abc" to 1042 would hand back someone else's order.
    expect(parseOrderNumber("1042abc")).toBe(null);
    expect(parseOrderNumber("1042 1043")).toBe(null);
  });

  it("does not mistake a cuid for an order number", () => {
    expect(parseOrderNumber("clx3k9f2a0001abcd8xyz9012")).toBe(null);
  });
});

describe("looksLikeOrderId", () => {
  it("recognises a cuid", () => {
    expect(looksLikeOrderId("clx3k9f2a0001abcd8xyz9012")).toBe(true);
    expect(looksLikeOrderId("  clx3k9f2a0001abcd8xyz9012 ")).toBe(true);
  });

  it("does not claim order numbers", () => {
    expect(looksLikeOrderId("STL-1042")).toBe(false);
    expect(looksLikeOrderId("1042")).toBe(false);
    expect(looksLikeOrderId("clx")).toBe(false);
  });
});
