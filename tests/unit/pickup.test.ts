import { describe, expect, it } from "vitest";
import {
  agingBucket,
  daysWaiting,
  generateLookupToken,
  isFullyPickedUp,
  isPartiallyPickedUp,
  lineOutstanding,
  orderOutstanding,
  reservedFromRows,
  validatePickupLines,
} from "@/lib/pickup";

const line = (id: string, quantity: number, qtyPickedUp = 0) => ({ id, quantity, qtyPickedUp });

describe("lineOutstanding", () => {
  it("returns units still owed", () => {
    expect(lineOutstanding({ quantity: 3, qtyPickedUp: 1 })).toBe(2);
  });

  it("never goes negative even if data is corrupt", () => {
    expect(lineOutstanding({ quantity: 2, qtyPickedUp: 5 })).toBe(0);
  });
});

describe("orderOutstanding", () => {
  it("sums across lines", () => {
    expect(orderOutstanding([line("a", 3, 1), line("b", 2, 2), line("c", 1)])).toBe(3);
  });

  it("is 0 for an empty order", () => {
    expect(orderOutstanding([])).toBe(0);
  });
});

describe("isFullyPickedUp", () => {
  it("is true when every line is complete", () => {
    expect(isFullyPickedUp([line("a", 2, 2), line("b", 1, 1)])).toBe(true);
  });

  it("is false when any line has units left", () => {
    expect(isFullyPickedUp([line("a", 2, 2), line("b", 3, 1)])).toBe(false);
  });

  it("is false for an order with no items (data bug, not a completed handoff)", () => {
    expect(isFullyPickedUp([])).toBe(false);
  });
});

describe("isPartiallyPickedUp", () => {
  it("is true when some units are collected", () => {
    expect(isPartiallyPickedUp([line("a", 3, 1)])).toBe(true);
  });

  it("is false when nothing is collected", () => {
    expect(isPartiallyPickedUp([line("a", 3, 0)])).toBe(false);
  });

  it("is false when everything is collected", () => {
    expect(isPartiallyPickedUp([line("a", 3, 3)])).toBe(false);
  });
});

describe("daysWaiting / agingBucket", () => {
  const base = new Date("2026-07-22T12:00:00Z");

  it("floors to whole days", () => {
    expect(daysWaiting(new Date("2026-07-20T13:00:00Z"), base)).toBe(1);
  });

  it("clamps future dates to 0", () => {
    expect(daysWaiting(new Date("2026-08-01T00:00:00Z"), base)).toBe(0);
  });

  it("buckets by age", () => {
    expect(agingBucket(0)).toBe("0-7");
    expect(agingBucket(7)).toBe("0-7");
    expect(agingBucket(8)).toBe("8-30");
    expect(agingBucket(30)).toBe("8-30");
    expect(agingBucket(31)).toBe("31-60");
    expect(agingBucket(60)).toBe("31-60");
    expect(agingBucket(61)).toBe("60+");
  });
});

describe("validatePickupLines", () => {
  const items = [line("a", 3, 1), line("b", 2, 0)];

  it("accepts a partial pickup", () => {
    const res = validatePickupLines(items, [{ orderItemId: "a", qty: 1 }]);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.lines[0].nextQtyPickedUp).toBe(2);
  });

  it("accepts collecting the remainder", () => {
    const res = validatePickupLines(items, [
      { orderItemId: "a", qty: 2 },
      { orderItemId: "b", qty: 2 },
    ]);
    expect(res.ok).toBe(true);
  });

  it("rejects over-pickup", () => {
    const res = validatePickupLines(items, [{ orderItemId: "a", qty: 3 }]);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/Only 2 left/);
  });

  it("rejects a line from another order", () => {
    const res = validatePickupLines(items, [{ orderItemId: "zzz", qty: 1 }]);
    expect(res.ok).toBe(false);
  });

  it("rejects duplicate lines rather than summing them", () => {
    const res = validatePickupLines(items, [
      { orderItemId: "a", qty: 1 },
      { orderItemId: "a", qty: 1 },
    ]);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/Duplicate/);
  });

  it("rejects fractional quantities", () => {
    expect(validatePickupLines(items, [{ orderItemId: "a", qty: 1.5 }]).ok).toBe(false);
  });

  it("allows a negative correction within bounds", () => {
    const res = validatePickupLines(items, [{ orderItemId: "a", qty: -1 }]);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.lines[0].nextQtyPickedUp).toBe(0);
  });

  it("rejects a correction that would go below zero", () => {
    const res = validatePickupLines(items, [{ orderItemId: "b", qty: -1 }]);
    expect(res.ok).toBe(false);
  });

  it("drops zero-qty lines and rejects an all-zero request", () => {
    expect(validatePickupLines(items, [{ orderItemId: "a", qty: 0 }]).ok).toBe(false);
  });

  it("rejects an empty request", () => {
    expect(validatePickupLines(items, []).ok).toBe(false);
  });
});

describe("reservedFromRows", () => {
  it("sums outstanding units per product", () => {
    const map = reservedFromRows([
      { productId: "p1", quantity: 3, qtyPickedUp: 1 },
      { productId: "p1", quantity: 2, qtyPickedUp: 0 },
      { productId: "p2", quantity: 1, qtyPickedUp: 1 },
    ]);
    expect(map).toEqual({ p1: 4 });
  });

  it("omits fully collected products entirely", () => {
    expect(reservedFromRows([{ productId: "p", quantity: 2, qtyPickedUp: 2 }])).toEqual({});
  });
});

describe("generateLookupToken", () => {
  it("is URL-safe and long enough to be unguessable", () => {
    const t = generateLookupToken();
    expect(t).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(t.length).toBeGreaterThanOrEqual(32);
  });

  it("does not repeat", () => {
    const tokens = new Set(Array.from({ length: 200 }, generateLookupToken));
    expect(tokens.size).toBe(200);
  });
});
