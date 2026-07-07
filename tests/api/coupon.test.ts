import { describe, it, expect } from "vitest";
import { prismaMock, jsonRequest } from "./setup";
import { POST } from "@/app/api/coupon/route";

describe("POST /api/coupon (cart preview)", () => {
  it("400s on missing code", async () => {
    const res = await POST(jsonRequest({ subtotalCents: 5000 }));
    expect(res.status).toBe(400);
  });

  it("returns the discount for a valid PERCENT code", async () => {
    prismaMock.coupon.findUnique.mockResolvedValue({
      id: "c1", code: "SAVE10", kind: "PERCENT", value: 10,
      active: true, minSubtotalCents: 0, maxRedemptions: null, timesRedeemed: 0, expiresAt: null,
    });
    const res = await POST(jsonRequest({ code: "save10", subtotalCents: 5000 }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, code: "SAVE10", discountCents: 500 });
  });

  it("floors a negative subtotal to 0 and surfaces the min-spend error", async () => {
    prismaMock.coupon.findUnique.mockResolvedValue({
      id: "c1", code: "SAVE10", kind: "PERCENT", value: 10,
      active: true, minSubtotalCents: 1000, maxRedemptions: null, timesRedeemed: 0, expiresAt: null,
    });
    const res = await POST(jsonRequest({ code: "SAVE10", subtotalCents: -50 }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Spend $10.00 to use this code.");
  });

  it("400s on an unknown code", async () => {
    prismaMock.coupon.findUnique.mockResolvedValue(null);
    const res = await POST(jsonRequest({ code: "NOPE", subtotalCents: 5000 }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("That code isn't valid.");
  });
});
