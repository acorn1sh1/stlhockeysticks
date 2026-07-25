import { describe, expect, it } from "vitest";
import {
  renderDailySummary,
  summaryRevenueCents,
  type SummaryData,
} from "@/lib/dailySummaryRender";

const base = (over: Partial<SummaryData> = {}): SummaryData => ({
  windowStart: new Date("2026-07-24T03:00:00Z"),
  windowEnd: new Date("2026-07-25T03:00:00Z"),
  paid: [],
  unpaid: [],
  claims: [],
  ...over,
});

const order = (over: Partial<SummaryData["paid"][number]> = {}) => ({
  orderNumber: 1005,
  name: "Jane Doe",
  email: "jane@example.com",
  itemCount: 2,
  totalCents: 23798,
  status: "PAID",
  ...over,
});

describe("summaryRevenueCents", () => {
  it("sums only paid orders", () => {
    const d = base({
      paid: [order({ totalCents: 10000 }), order({ totalCents: 5000 })],
      unpaid: [order({ totalCents: 99999, status: "PENDING_PAYMENT" })],
    });
    expect(summaryRevenueCents(d)).toBe(15000);
  });
});

describe("renderDailySummary — empty night", () => {
  const { subject, html } = renderDailySummary(base());

  it("still produces an email that says zero everywhere", () => {
    expect(subject).toMatch(/0 paid orders/);
    expect(html).toMatch(/0 paid orders/);
    expect(html).toMatch(/0 unpaid or abandoned orders/);
    expect(html).toMatch(/0 warranty claims/);
  });

  it("shows $0.00 revenue and no warranty mention in the subject", () => {
    expect(subject).toMatch(/\$0\.00/);
    expect(subject).not.toMatch(/warranty/);
  });
});

describe("renderDailySummary — active night", () => {
  const d = base({
    paid: [
      order({ orderNumber: 1005, totalCents: 11900 }),
      order({ orderNumber: 1006, name: "Bob", totalCents: 7900 }),
    ],
    unpaid: [order({ orderNumber: 1007, status: "PENDING_PAYMENT", totalCents: 5900 })],
    claims: [
      {
        orderNumber: 1002,
        productName: "Elite Senior Stick",
        name: "Coach K",
        email: "k@club.com",
        description: "Blade delaminated after one skate.",
      },
    ],
  });
  const { subject, html } = renderDailySummary(d);

  it("counts paid orders and sums their revenue in the subject", () => {
    expect(subject).toMatch(/2 paid orders/);
    expect(subject).toMatch(/\$198\.00/); // 119 + 79
  });

  it("mentions the warranty claim in the subject", () => {
    expect(subject).toMatch(/1 warranty claim/);
  });

  it("lists each paid order by number", () => {
    expect(html).toMatch(/STL-1005/);
    expect(html).toMatch(/STL-1006/);
  });

  it("keeps the unpaid order out of the paid section and revenue", () => {
    expect(summaryRevenueCents(d)).toBe(19800); // unpaid 5900 excluded
    expect(html).toMatch(/STL-1007/); // still listed, in the unpaid section
    expect(html).toMatch(/Unpaid &amp; abandoned — 1/);
  });

  it("shows the warranty claim with its order number and product", () => {
    expect(html).toMatch(/STL-1002/);
    expect(html).toMatch(/Elite Senior Stick/);
  });

  it("escapes HTML in customer-supplied fields", () => {
    const evil = renderDailySummary(
      base({ paid: [order({ name: "<script>alert(1)</script>" })] }),
    );
    expect(evil.html).not.toMatch(/<script>alert/);
    expect(evil.html).toMatch(/&lt;script&gt;/);
  });
});
