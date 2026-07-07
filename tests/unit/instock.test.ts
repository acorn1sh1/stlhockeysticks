import { describe, it, expect } from "vitest";
import type { CatalogItem } from "@/lib/catalog";
import {
  applyFilterSort,
  deriveFacets,
  filterItems,
  hasActiveFilters,
  isShipsNow,
  sizeKeyOf,
  sizeLabel,
  sortItems,
} from "@/lib/instock";

function sku(over: Partial<CatalogItem> = {}): CatalogItem {
  return {
    slug: over.slug ?? "s",
    name: over.name ?? "Stick",
    description: "",
    category: over.category ?? "FULL_STICK",
    priceCents: over.priceCents ?? 9900,
    inStock: true,
    ...over,
  };
}

const items: CatalogItem[] = [
  sku({
    slug: "sr-85-p92",
    name: "Senior 85 P92",
    sizingTier: "SENIOR",
    priceCents: 9900,
    stockCount: 4,
    fixed: { flex: 85, curve: "P92", hand: "Right", color: "Black" },
  }),
  sku({
    slug: "sr-75-p28",
    name: "Senior 75 P28",
    sizingTier: "SENIOR",
    priceCents: 8900,
    stockCount: 0, // out of on-hand → pre-order fallback
    fixed: { flex: 75, curve: "P28", hand: "Left", color: "Red" },
  }),
  sku({
    slug: "jr-50-p92",
    name: "Junior 50 P92",
    sizingTier: "JR",
    priceCents: 6900,
    stockCount: 2,
    fixed: { flex: 50, curve: "P92", hand: "Right", color: "Black" },
  }),
  sku({
    slug: "goalie-1",
    name: "Goalie Foam Core",
    category: "GOALIE",
    priceCents: 7900,
    stockCount: 1,
    fixed: { hand: "Right", color: "Green" }, // no flex
  }),
];

describe("sizeKeyOf", () => {
  it("uses sizing tier when present", () => {
    expect(sizeKeyOf(items[0])).toBe("SENIOR");
  });
  it("maps goalie category to GOALIE bucket", () => {
    expect(sizeKeyOf(items[3])).toBe("GOALIE");
  });
  it("is undefined when neither applies", () => {
    expect(sizeKeyOf(sku({ category: "FULL_STICK", sizingTier: undefined }))).toBeUndefined();
  });
});

describe("sizeLabel", () => {
  it("humanizes known keys and passes through unknown", () => {
    expect(sizeLabel("SENIOR")).toBe("Senior");
    expect(sizeLabel("GOALIE")).toBe("Goalie");
    expect(sizeLabel("WHATEVER")).toBe("WHATEVER");
  });
});

describe("isShipsNow", () => {
  it("true when on-hand > 0, false at 0 or undefined", () => {
    expect(isShipsNow(items[0])).toBe(true);
    expect(isShipsNow(items[1])).toBe(false);
    expect(isShipsNow(sku({ stockCount: undefined }))).toBe(false);
  });
});

describe("deriveFacets", () => {
  const f = deriveFacets(items);
  it("collects distinct sizes", () => {
    expect(f.sizes).toEqual(["GOALIE", "JR", "SENIOR"]);
  });
  it("collects distinct flexes numerically sorted, skipping missing", () => {
    expect(f.flexes).toEqual([50, 75, 85]);
  });
  it("collects distinct curves/hands/colors", () => {
    expect(f.curves).toEqual(["P28", "P92"]);
    expect(f.hands).toEqual(["Left", "Right"]);
    expect(f.colors).toEqual(["Black", "Green", "Red"]);
  });
  it("computes price bounds", () => {
    expect(f.priceMin).toBe(6900);
    expect(f.priceMax).toBe(9900);
  });
  it("is empty/zero for no items", () => {
    const e = deriveFacets([]);
    expect(e.sizes).toEqual([]);
    expect(e.priceMin).toBe(0);
    expect(e.priceMax).toBe(0);
  });
});

describe("filterItems", () => {
  it("filters by size", () => {
    expect(filterItems(items, { size: "SENIOR" }).map((i) => i.slug)).toEqual([
      "sr-85-p92",
      "sr-75-p28",
    ]);
  });
  it("filters by flex (string match)", () => {
    expect(filterItems(items, { flex: "50" }).map((i) => i.slug)).toEqual(["jr-50-p92"]);
  });
  it("filters by curve, hand, color", () => {
    expect(filterItems(items, { curve: "P92" }).map((i) => i.slug)).toEqual([
      "sr-85-p92",
      "jr-50-p92",
    ]);
    expect(filterItems(items, { hand: "Left" }).map((i) => i.slug)).toEqual(["sr-75-p28"]);
    expect(filterItems(items, { color: "Green" }).map((i) => i.slug)).toEqual(["goalie-1"]);
  });
  it("shipsNowOnly drops out-of-stock items", () => {
    expect(filterItems(items, { shipsNowOnly: true }).map((i) => i.slug)).toEqual([
      "sr-85-p92",
      "jr-50-p92",
      "goalie-1",
    ]);
  });
  it("combines filters (AND)", () => {
    expect(
      filterItems(items, { size: "SENIOR", curve: "P92" }).map((i) => i.slug)
    ).toEqual(["sr-85-p92"]);
  });
});

describe("sortItems", () => {
  const slugs = (arr: CatalogItem[]) => arr.map((i) => i.slug);
  it("price ascending / descending", () => {
    expect(slugs(sortItems(items, "price-asc"))).toEqual([
      "jr-50-p92",
      "goalie-1",
      "sr-75-p28",
      "sr-85-p92",
    ]);
    expect(slugs(sortItems(items, "price-desc"))[0]).toBe("sr-85-p92");
  });
  it("flex ascending sinks missing-flex to the bottom", () => {
    expect(slugs(sortItems(items, "flex-asc"))).toEqual([
      "jr-50-p92",
      "sr-75-p28",
      "sr-85-p92",
      "goalie-1", // no flex → last
    ]);
  });
  it("flex descending puts missing-flex last too", () => {
    expect(slugs(sortItems(items, "flex-desc"))).toEqual([
      "sr-85-p92",
      "sr-75-p28",
      "jr-50-p92",
      "goalie-1",
    ]);
  });
  it("name A–Z", () => {
    expect(slugs(sortItems(items, "name"))).toEqual([
      "goalie-1",
      "jr-50-p92",
      "sr-75-p28",
      "sr-85-p92",
    ]);
  });
  it("ships puts in-stock before out-of-stock, then cheapest", () => {
    const ordered = slugs(sortItems(items, "ships"));
    // out-of-stock (sr-75-p28) must be last
    expect(ordered[ordered.length - 1]).toBe("sr-75-p28");
    // among ships-now, cheapest first
    expect(ordered.slice(0, 3)).toEqual(["jr-50-p92", "goalie-1", "sr-85-p92"]);
  });
  it("does not mutate the input array", () => {
    const before = items.map((i) => i.slug);
    sortItems(items, "price-desc");
    expect(items.map((i) => i.slug)).toEqual(before);
  });
});

describe("applyFilterSort", () => {
  it("filters then sorts", () => {
    const out = applyFilterSort(items, { size: "SENIOR" }, "price-asc");
    expect(out.map((i) => i.slug)).toEqual(["sr-75-p28", "sr-85-p92"]);
  });
});

describe("hasActiveFilters", () => {
  it("false for empty, true when any facet set", () => {
    expect(hasActiveFilters({})).toBe(false);
    expect(hasActiveFilters({ size: "SENIOR" })).toBe(true);
    expect(hasActiveFilters({ shipsNowOnly: true })).toBe(true);
  });
});
