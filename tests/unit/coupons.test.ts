import { describe, it, expect, vi, beforeEach } from "vitest";

// coupons.ts talks to Prisma; stub it so these stay pure unit tests.
// vi.hoisted keeps the mock handle reachable from the hoisted vi.mock factory.
const { findUnique } = vi.hoisted(() => ({ findUnique: vi.fn() }));
vi.mock("@/lib/db", () => ({ prisma: { coupon: { findUnique } } }));

import { validateCoupon } from "@/lib/coupons";

type CouponRow = {
  id: string;
  code: string;
  kind: "PERCENT" | "FIXED";
  value: number;
  active: boolean;
  minSubtotalCents: number;
  maxRedemptions: number | null;
  timesRedeemed: number;
  expiresAt: Date | null;
};

const base: CouponRow = {
  id: "c1",
  code: "SAVE10",
  kind: "PERCENT",
  value: 10,
  active: true,
  minSubtotalCents: 0,
  maxRedemptions: null,
  timesRedeemed: 0,
  expiresAt: null,
};

beforeEach(() => vi.clearAllMocks());

describe("validateCoupon", () => {
  it("rejects an empty code without hitting the DB", async () => {
    const r = await validateCoupon("   ", 5000);
    expect(r).toEqual({ ok: false, error: "Enter a code." });
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("uppercases + trims the code for lookup", async () => {
    findUnique.mockResolvedValue(base);
    await validateCoupon("  save10 ", 5000);
    expect(findUnique).toHaveBeenCalledWith({ where: { code: "SAVE10" } });
  });

  it("handles a DB error gracefully", async () => {
    findUnique.mockRejectedValue(new Error("db down"));
    const r = await validateCoupon("SAVE10", 5000);
    expect(r).toEqual({ ok: false, error: "Couldn't validate that code." });
  });

  it("rejects unknown or inactive codes", async () => {
    findUnique.mockResolvedValue(null);
    expect(await validateCoupon("NOPE", 5000)).toEqual({ ok: false, error: "That code isn't valid." });

    findUnique.mockResolvedValue({ ...base, active: false });
    expect(await validateCoupon("SAVE10", 5000)).toEqual({ ok: false, error: "That code isn't valid." });
  });

  it("rejects an expired code", async () => {
    findUnique.mockResolvedValue({ ...base, expiresAt: new Date(Date.now() - 1000) });
    const r = await validateCoupon("SAVE10", 5000);
    expect(r).toEqual({ ok: false, error: "That code has expired." });
  });

  it("accepts a not-yet-expired code", async () => {
    findUnique.mockResolvedValue({ ...base, expiresAt: new Date(Date.now() + 60_000) });
    const r = await validateCoupon("SAVE10", 5000);
    expect(r.ok).toBe(true);
  });

  it("rejects a fully-redeemed code", async () => {
    findUnique.mockResolvedValue({ ...base, maxRedemptions: 5, timesRedeemed: 5 });
    const r = await validateCoupon("SAVE10", 5000);
    expect(r).toEqual({ ok: false, error: "That code has been fully redeemed." });
  });

  it("enforces the minimum subtotal", async () => {
    findUnique.mockResolvedValue({ ...base, minSubtotalCents: 10000 });
    const r = await validateCoupon("SAVE10", 5000);
    expect(r).toEqual({ ok: false, error: "Spend $100.00 to use this code." });
  });

  it("computes a PERCENT discount (rounded)", async () => {
    findUnique.mockResolvedValue({ ...base, kind: "PERCENT", value: 15 });
    const r = await validateCoupon("SAVE10", 3333);
    expect(r).toEqual({ ok: true, couponId: "c1", code: "SAVE10", discountCents: Math.round(3333 * 0.15) });
  });

  it("computes a FIXED discount", async () => {
    findUnique.mockResolvedValue({ ...base, kind: "FIXED", value: 2000 });
    const r = await validateCoupon("SAVE10", 5000);
    expect(r).toMatchObject({ ok: true, discountCents: 2000 });
  });

  it("clamps a FIXED discount to the subtotal (never negative total)", async () => {
    findUnique.mockResolvedValue({ ...base, kind: "FIXED", value: 999999 });
    const r = await validateCoupon("SAVE10", 5000);
    expect(r).toMatchObject({ ok: true, discountCents: 5000 });
  });
});
