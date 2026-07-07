// Pure filter/sort helpers for the in-stock listing (/sticks/in-stock).
// Kept free of React so they're unit-testable and could later be reused
// server-side (mapped to Prisma WHERE/ORDER BY) if the catalog outgrows
// client-side filtering. Facets are derived from the SKUs actually present
// so admin-added attributes (new curve, new color) show up with no code
// change — nothing here is hardcoded to a fixed value set.
import type { CatalogItem } from "./catalog";

export type SortKey =
  | "ships"
  | "price-asc"
  | "price-desc"
  | "flex-asc"
  | "flex-desc"
  | "name";

export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "ships", label: "Ships now first" },
  { key: "price-asc", label: "Price: low to high" },
  { key: "price-desc", label: "Price: high to low" },
  { key: "flex-asc", label: "Flex: low to high" },
  { key: "flex-desc", label: "Flex: high to low" },
  { key: "name", label: "Name: A–Z" },
];

export type InStockFilters = {
  size?: string; // sizing tier key, or "GOALIE"
  flex?: string; // stringified flex (select value)
  curve?: string;
  hand?: string;
  color?: string;
  shipsNowOnly?: boolean;
};

// Size bucket for grouping/filtering: the sizing tier, or GOALIE for the
// goalie category (which carries no tier). Undefined if neither applies.
export function sizeKeyOf(item: CatalogItem): string | undefined {
  if (item.sizingTier) return item.sizingTier;
  if (item.category === "GOALIE") return "GOALIE";
  return undefined;
}

const SIZE_LABELS: Record<string, string> = {
  SENIOR: "Senior",
  INT: "Intermediate",
  JR: "Junior",
  YTH: "Youth",
  GOALIE: "Goalie",
};

export function sizeLabel(key: string): string {
  return SIZE_LABELS[key] ?? key;
}

// Ships-now = we hold at least one unit. Zero on-hand falls back to
// pre-order into the next batch (handled by ProductCard), so it's still a
// valid in-stock listing entry, just not "grab it today".
export function isShipsNow(item: CatalogItem): boolean {
  return (item.stockCount ?? 0) > 0;
}

export type Facets = {
  sizes: string[];
  flexes: number[];
  curves: string[];
  hands: string[];
  colors: string[];
  priceMin: number;
  priceMax: number;
};

function uniqStrings(vals: (string | undefined | null)[]): string[] {
  const set = new Set<string>();
  for (const v of vals) if (v) set.add(v);
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

function uniqNumbers(vals: (number | undefined | null)[]): number[] {
  const set = new Set<number>();
  for (const v of vals) if (v != null) set.add(v);
  return Array.from(set).sort((a, b) => a - b);
}

export function deriveFacets(items: CatalogItem[]): Facets {
  const prices = items.map((i) => i.priceCents);
  return {
    sizes: uniqStrings(items.map(sizeKeyOf)),
    flexes: uniqNumbers(items.map((i) => i.fixed?.flex)),
    curves: uniqStrings(items.map((i) => i.fixed?.curve)),
    hands: uniqStrings(items.map((i) => i.fixed?.hand)),
    colors: uniqStrings(items.map((i) => i.fixed?.color)),
    priceMin: prices.length ? Math.min(...prices) : 0,
    priceMax: prices.length ? Math.max(...prices) : 0,
  };
}

export function filterItems(items: CatalogItem[], f: InStockFilters): CatalogItem[] {
  return items.filter((i) => {
    if (f.size && sizeKeyOf(i) !== f.size) return false;
    if (f.flex && String(i.fixed?.flex ?? "") !== f.flex) return false;
    if (f.curve && i.fixed?.curve !== f.curve) return false;
    if (f.hand && i.fixed?.hand !== f.hand) return false;
    if (f.color && i.fixed?.color !== f.color) return false;
    if (f.shipsNowOnly && !isShipsNow(i)) return false;
    return true;
  });
}

export function sortItems(items: CatalogItem[], key: SortKey): CatalogItem[] {
  const arr = [...items];
  const byName = (a: CatalogItem, b: CatalogItem) => a.name.localeCompare(b.name);
  switch (key) {
    case "price-asc":
      arr.sort((a, b) => a.priceCents - b.priceCents || byName(a, b));
      break;
    case "price-desc":
      arr.sort((a, b) => b.priceCents - a.priceCents || byName(a, b));
      break;
    case "flex-asc":
      // Missing flex sinks to the bottom on an ascending sort.
      arr.sort(
        (a, b) =>
          (a.fixed?.flex ?? Infinity) - (b.fixed?.flex ?? Infinity) || byName(a, b)
      );
      break;
    case "flex-desc":
      arr.sort(
        (a, b) =>
          (b.fixed?.flex ?? -Infinity) - (a.fixed?.flex ?? -Infinity) || byName(a, b)
      );
      break;
    case "name":
      arr.sort(byName);
      break;
    case "ships":
    default:
      // Ships-now first, then cheapest, then name — the sensible default.
      arr.sort(
        (a, b) =>
          Number(isShipsNow(b)) - Number(isShipsNow(a)) ||
          a.priceCents - b.priceCents ||
          byName(a, b)
      );
      break;
  }
  return arr;
}

export function applyFilterSort(
  items: CatalogItem[],
  f: InStockFilters,
  sort: SortKey
): CatalogItem[] {
  return sortItems(filterItems(items, f), sort);
}

export function hasActiveFilters(f: InStockFilters): boolean {
  return Boolean(f.size || f.flex || f.curve || f.hand || f.color || f.shipsNowOnly);
}
