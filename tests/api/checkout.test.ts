import { describe, it, expect } from "vitest";
import {
  prismaMock,
  createHostedCheckoutMock,
  jsonRequest,
} from "./setup";
import { POST } from "@/app/api/checkout/route";

// A DB product row mirroring the static catalog entry.
function product(over: Partial<Record<string, unknown>> = {}) {
  return {
    id: "prod_elite",
    slug: "elite-senior-stick",
    name: "Elite Senior Stick",
    description: "x",
    category: "FULL_STICK",
    priceCents: 11900,
    inStock: 100,
    preorder: false,
    active: true,
    ...over,
  };
}

const validLine = {
  slug: "elite-senior-stick",
  quantity: 1,
  options: { flex: "85", curve: "P92", hand: "Right", color: "Black" },
};

function okClover() {
  createHostedCheckoutMock.mockResolvedValue({
    href: "https://pay.clover/abc",
    checkoutSessionId: "chk_1",
  });
}

describe("POST /api/checkout", () => {
  it("400s on missing required fields", async () => {
    const res = await POST(jsonRequest({ email: "a@b.com" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Missing fields" });
  });

  it("400s when a cart product is unknown/inactive", async () => {
    prismaMock.product.findMany.mockResolvedValue([]); // none found
    const res = await POST(
      jsonRequest({ email: "a@b.com", name: "A B", lines: [validLine] })
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Unknown product in cart" });
  });

  it("400s on invalid options, naming the product", async () => {
    prismaMock.product.findMany.mockResolvedValue([product()]);
    const res = await POST(
      jsonRequest({
        email: "a@b.com",
        name: "A B",
        lines: [{ slug: "elite-senior-stick", quantity: 1, options: { flex: "1", curve: "P92", hand: "Right" } }],
      })
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Elite Senior Stick: Invalid flex");
  });

  it("re-prices on the server: applies option upcharges, never trusts client", async () => {
    prismaMock.product.findMany.mockResolvedValue([product()]);
    prismaMock.order.create.mockResolvedValue({ id: "order_1" });
    prismaMock.order.update.mockResolvedValue({});
    okClover();

    const res = await POST(
      jsonRequest({
        email: "a@b.com",
        name: "Andrew Cornish",
        // Red (+$10) and a custom name (+$10) => 11900 + 2000 = 13900
        lines: [{ slug: "elite-senior-stick", quantity: 2, options: { flex: "85", curve: "P92", hand: "Right", color: "Red", customName: "AC" } }],
      })
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ url: "https://pay.clover/abc", orderId: "order_1" });

    const orderArg = prismaMock.order.create.mock.calls[0][0].data;
    expect(orderArg.subtotalCents).toBe(13900 * 2);
    const cloverArg = createHostedCheckoutMock.mock.calls[0][0];
    expect(cloverArg.lines[0]).toMatchObject({ priceCents: 13900, quantity: 2 });
  });

  it("applies the 10% club donation discount past 20 sticks", async () => {
    prismaMock.product.findMany.mockResolvedValue([
      product({ id: "prod_club", slug: "club-custom-mini-stick", name: "Club Custom Mini Stick", priceCents: 2799, category: "MINI_CLUB" }),
    ]);
    prismaMock.order.create.mockResolvedValue({ id: "order_2" });
    prismaMock.order.update.mockResolvedValue({});
    okClover();

    const res = await POST(
      jsonRequest({ email: "coach@club.com", name: "Coach K", lines: [{ slug: "club-custom-mini-stick", quantity: 25 }] })
    );
    expect(res.status).toBe(200);
    const orderArg = prismaMock.order.create.mock.calls[0][0].data;
    const expectedDiscount = Math.round(2799 * 25 * 0.1);
    expect(orderArg.discountCents).toBe(expectedDiscount);
    expect(orderArg.subtotalCents).toBe(2799 * 25 - expectedDiscount);
    // Clover rejects negative shoppingCart.lineItems[].price ("Line item
    // prices should be positive"), so the discount must be folded into
    // positive-priced lines instead of sent as its own negative line — and
    // the lines must still sum to exactly the discounted subtotal.
    const cloverArg = createHostedCheckoutMock.mock.calls[0][0];
    expect(cloverArg.lines.every((l: { priceCents: number }) => l.priceCents > 0)).toBe(true);
    const cloverTotal = cloverArg.lines.reduce(
      (n: number, l: { priceCents: number; quantity: number }) => n + l.priceCents * l.quantity,
      0
    );
    expect(cloverTotal).toBe(2799 * 25 - expectedDiscount);
  });

  it("rejects an invalid coupon at checkout (server re-validates)", async () => {
    prismaMock.product.findMany.mockResolvedValue([product()]);
    prismaMock.coupon.findUnique.mockResolvedValue(null); // unknown code
    const res = await POST(
      jsonRequest({ email: "a@b.com", name: "A B", couponCode: "FAKE", lines: [validLine] })
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("That code isn't valid.");
  });

  it("attaches a batch when on-hand stock cannot cover the line", async () => {
    prismaMock.product.findMany.mockResolvedValue([product({ inStock: 0 })]);
    prismaMock.batch.updateMany.mockResolvedValue({ count: 0 });
    prismaMock.batch.findFirst.mockResolvedValue(null);
    prismaMock.batch.create.mockResolvedValue({ id: "batch_1" });
    prismaMock.order.create.mockResolvedValue({ id: "order_3" });
    prismaMock.order.update.mockResolvedValue({});
    okClover();

    const res = await POST(jsonRequest({ email: "a@b.com", name: "A B", lines: [validLine] }));
    expect(res.status).toBe(200);
    expect(prismaMock.batch.create).toHaveBeenCalled();
    expect(prismaMock.order.create.mock.calls[0][0].data.batchId).toBe("batch_1");
  });

  it("502s and cancels the order when the payment processor fails", async () => {
    prismaMock.product.findMany.mockResolvedValue([product()]);
    prismaMock.order.create.mockResolvedValue({ id: "order_4" });
    prismaMock.order.update.mockResolvedValue({});
    createHostedCheckoutMock.mockRejectedValue(new Error("clover 500"));

    const res = await POST(jsonRequest({ email: "a@b.com", name: "A B", lines: [validLine] }));
    expect(res.status).toBe(502);
    // Order should be flipped to CANCELLED.
    const updateCalls = prismaMock.order.update.mock.calls.map((c) => c[0]);
    expect(updateCalls.some((u) => u.data?.status === "CANCELLED")).toBe(true);
  });
});
