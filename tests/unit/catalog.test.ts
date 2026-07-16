import { describe, it, expect, vi, afterEach } from "vitest";
import {
  CATALOG,
  COLORS,
  fmtPrice,
  unitPriceCents,
  validateOptions,
  optionsSummary,
  clubDiscountCents,
  nextBatch,
  CLUB_STICK_SLUG,
  CLUB_DISCOUNT_THRESHOLD,
  type CatalogItem,
} from "@/lib/catalog";

const elite = CATALOG.find((c) => c.slug === "elite-senior-stick")! as CatalogItem;
const goalie = CATALOG.find((c) => c.slug === "elite-goalie-stick")! as CatalogItem;
const mini = CATALOG.find((c) => c.slug === CLUB_STICK_SLUG)! as CatalogItem;

describe("fmtPrice", () => {
  it("formats cents as dollars", () => {
    expect(fmtPrice(11900)).toBe("$119.00");
    expect(fmtPrice(2799)).toBe("$27.99");
    expect(fmtPrice(0)).toBe("$0.00");
  });
});

describe("unitPriceCents", () => {
  it("returns base price with no options", () => {
    expect(unitPriceCents(elite)).toBe(11900);
  });

  it("charges nothing for the standard (first) color", () => {
    expect(unitPriceCents(elite, { color: elite.options!.colors[0] })).toBe(11900);
  });

  it("charges nothing for a non-standard color (no color upcharge)", () => {
    // colorUpchargeCents is 0 — all colors are the same price, no phantom
    // charge. See baseOpts in lib/catalog.ts and the COLOR seed in
    // prisma/seed.mjs ("all colors included, no upcharge").
    expect(unitPriceCents(elite, { color: "Red" })).toBe(11900);
  });

  it("adds the name upcharge when a custom name is set", () => {
    expect(unitPriceCents(elite, { customName: "TITAN" })).toBe(11900 + 1000);
  });

  it("treats whitespace-only custom name as empty (no upcharge)", () => {
    expect(unitPriceCents(elite, { customName: "   " })).toBe(11900);
  });

  it("charges only the name upcharge when color + name are both set", () => {
    expect(unitPriceCents(elite, { color: "Green", customName: "AC" })).toBe(11900 + 1000);
  });

  it("ignores options for items that have none (minis)", () => {
    expect(unitPriceCents(mini, { color: "Red", customName: "X" })).toBe(mini.priceCents);
  });
});

describe("validateOptions", () => {
  const valid = { flex: "85", curve: "P92", hand: "Right", color: "Black" };

  it("passes a fully valid selection", () => {
    expect(validateOptions(elite, valid)).toBeNull();
  });

  it("returns null for items without options", () => {
    expect(validateOptions(mini, undefined)).toBeNull();
  });

  it("requires options when the item is configurable", () => {
    expect(validateOptions(elite, undefined)).toBe("Missing options");
  });

  it("rejects an out-of-range flex", () => {
    expect(validateOptions(elite, { ...valid, flex: "999" })).toBe("Invalid flex");
  });

  it("rejects a curve not offered on this model", () => {
    // P28 valid on full sticks; use a made-up curve to force rejection.
    expect(validateOptions(elite, { ...valid, curve: "P00" })).toBe("Invalid curve");
  });

  it("rejects an invalid hand", () => {
    expect(validateOptions(elite, { ...valid, hand: "Sideways" })).toBe("Invalid hand");
  });

  it("rejects a color outside the palette", () => {
    expect(validateOptions(elite, { ...valid, color: "Chartreuse" })).toBe("Invalid color");
  });

  it("requires a paddle size for goalie sticks", () => {
    const g = { flex: "85", curve: "P31", hand: "Right" };
    expect(validateOptions(goalie, g)).toBe("Invalid paddle size");
    expect(validateOptions(goalie, { ...g, paddleSize: '26"' })).toBeNull();
  });

  it("rejects a custom name longer than 20 chars", () => {
    expect(validateOptions(elite, { ...valid, customName: "X".repeat(21) })).toBe(
      "Name too long (max 20 chars)"
    );
    expect(validateOptions(elite, { ...valid, customName: "X".repeat(20) })).toBeNull();
  });

  it("accepts every catalog color", () => {
    for (const color of COLORS) {
      expect(validateOptions(elite, { ...valid, color })).toBeNull();
    }
  });
});

describe("optionsSummary", () => {
  it("returns empty string when no options", () => {
    expect(optionsSummary(undefined)).toBe("");
  });

  it("joins present fields, hides Black, keeps other colors", () => {
    expect(
      optionsSummary({ flex: "85", curve: "P92", hand: "Right", color: "Black" })
    ).toBe("85 flex · P92 · Right");
    expect(optionsSummary({ color: "Red" })).toBe("Red");
  });

  it("quotes a trimmed custom name and includes paddle size", () => {
    expect(optionsSummary({ paddleSize: '26"', customName: "  AC  " })).toBe('26" paddle · "AC"');
  });
});

describe("clubDiscountCents", () => {
  const line = (quantity: number) => ({
    slug: CLUB_STICK_SLUG,
    quantity,
    priceCents: 2799,
  });

  it("is zero at or below the threshold", () => {
    expect(clubDiscountCents([line(CLUB_DISCOUNT_THRESHOLD)])).toBe(0);
    expect(clubDiscountCents([line(1)])).toBe(0);
  });

  it("applies 10% once quantity passes the threshold", () => {
    const qty = CLUB_DISCOUNT_THRESHOLD + 1; // 21
    const expected = Math.round(2799 * qty * 0.1);
    expect(clubDiscountCents([line(qty)])).toBe(expected);
  });

  it("sums club lines and ignores non-club lines", () => {
    const lines = [
      line(15),
      line(10), // 25 club total > 20
      { slug: "elite-senior-stick", quantity: 99, priceCents: 11900 },
    ];
    const expected = Math.round(2799 * 25 * 0.1);
    expect(clubDiscountCents(lines)).toBe(expected);
  });

  it("returns 0 when there are no club lines", () => {
    expect(clubDiscountCents([{ slug: "elite-senior-stick", quantity: 50, priceCents: 11900 }])).toBe(0);
  });
});

describe("nextBatch", () => {
  afterEach(() => vi.useRealTimers());

  it("sets cutoff to the 1st of next month with a positive daysLeft", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-06T12:00:00Z"));
    const b = nextBatch();
    expect(b.cutoff.getMonth()).toBe(7); // August (0-indexed)
    expect(b.cutoff.getDate()).toBe(1);
    expect(b.daysLeft).toBeGreaterThan(0);
    // Manufacturing takes 1 month after cutoff.
    expect(b.manufactureDone.getFullYear()).toBe(b.cutoff.getFullYear());
    expect(b.manufactureDone.getMonth()).toBe(b.cutoff.getMonth() + 1); // September
    expect(b.manufactureDone.getDate()).toBe(1);
    // Pickup window is 14-18 days after manufacturing completes.
    const days = (d: Date) => Math.round((d.getTime() - b.manufactureDone.getTime()) / 86400000);
    expect(days(b.pickupStart)).toBe(14);
    expect(days(b.pickupEnd)).toBe(18);
  });

  it("rolls the year over in December", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-12-20T00:00:00Z"));
    const b = nextBatch();
    expect(b.cutoff.getFullYear()).toBe(2027);
    expect(b.cutoff.getMonth()).toBe(0); // January
  });

  it("never returns a negative daysLeft", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-31T23:59:00Z"));
    expect(nextBatch().daysLeft).toBeGreaterThanOrEqual(0);
  });
});
