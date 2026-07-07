import { prisma } from "./db";
import { sizingOf, type CatalogItem, type StickOptions } from "./catalog";

// Loads the admin-editable option catalog (OptionValue rows) and assembles
// a StickOptions matrix for a given pre-order product. Options are scoped by
// sizing tier (flex/length) and category (curve/paddle). Rows with sizing or
// category = "ALL" apply everywhere. On any DB failure, callers fall back to
// the item's static `options` so the storefront never goes dark.

const NAME_UPCHARGE_CENTS = 1000; // custom name printing; not a per-row option (yet)

type Row = {
  kind: string;
  value: string;
  label: string | null;
  sizing: string;
  category: string;
  upchargeCents: number;
  isDefault: boolean;
  sortOrder: number;
};

// Cache the full option set per request-ish lifecycle (module-level memo with
// short TTL keeps the configurator snappy without staleness on admin edits).
let cache: { at: number; rows: Row[] } | null = null;
const TTL_MS = 15_000;

async function loadRows(): Promise<Row[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.rows;
  const rows = (await prisma.optionValue.findMany({
    where: { active: true },
    orderBy: [{ kind: "asc" }, { sortOrder: "asc" }],
  })) as unknown as Row[];
  cache = { at: Date.now(), rows };
  return rows;
}

export function invalidateOptionCache() {
  cache = null;
}

const scoped = (rows: Row[], kind: string, tier: string, cat: string) =>
  rows.filter(
    (r) =>
      r.kind === kind &&
      (r.sizing === "ALL" || r.sizing === tier) &&
      (r.category === "ALL" || r.category === cat)
  );

const firstDefault = (rows: Row[]) => rows.find((r) => r.isDefault)?.value;

// Build the option matrix for one pre-order item from DB rows.
export function optionsFromRows(item: CatalogItem, rows: Row[]): StickOptions {
  // Prefer the explicit Product.sizingTier (set by admin / seed); fall back
  // to the slug-substring guess only for static-fallback items that never
  // got a DB row (offline mode, or a static CATALOG entry with no DB match).
  const tier = item.sizingTier ?? sizingOf(item.slug);
  const cat = item.category;
  const isGoalie = cat === "GOALIE";

  const flexRows = scoped(rows, "FLEX", tier, cat);
  const curveRows = scoped(rows, "CURVE", tier, cat);
  const handRows = scoped(rows, "HAND", tier, cat);
  const colorRows = scoped(rows, "COLOR", tier, cat);
  const lengthRows = scoped(rows, "LENGTH", tier, cat);
  const paddleRows = scoped(rows, "PADDLE", tier, cat);

  // Color upcharge preserves current pricing model: first color = standard,
  // others flat upcharge (taken from the first non-zero color row).
  const colorUpchargeCents = colorRows.find((r) => r.upchargeCents > 0)?.upchargeCents ?? 1000;

  return {
    flex: flexRows.map((r) => Number(r.value)),
    curve: curveRows.map((r) => r.value),
    hand: handRows.map((r) => r.value),
    colors: colorRows.map((r) => r.value),
    length: lengthRows.length ? lengthRows.map((r) => r.value) : undefined,
    paddleSize: isGoalie && paddleRows.length ? paddleRows.map((r) => r.value) : undefined,
    colorUpchargeCents,
    nameUpchargeCents: NAME_UPCHARGE_CENTS,
    defaults: {
      flex: firstDefault(flexRows) != null ? Number(firstDefault(flexRows)) : undefined,
      curve: firstDefault(curveRows),
      hand: firstDefault(handRows),
      color: firstDefault(colorRows),
      length: firstDefault(lengthRows),
      paddleSize: firstDefault(paddleRows),
    },
  };
}

// Merge DB-sourced options onto a pre-order catalog item. Returns the item
// unchanged if it isn't configurable, or if the DB yields no usable options.
export async function withDbOptions(item: CatalogItem): Promise<CatalogItem> {
  if (!item.options) return item; // minis + in-stock: nothing to configure
  try {
    const rows = await loadRows();
    const opts = optionsFromRows(item, rows);
    // Guard: if the DB is empty/misconfigured for this tier, keep static.
    if (!opts.flex.length || !opts.curve.length || !opts.hand.length || !opts.colors.length) {
      return item;
    }
    return { ...item, options: opts };
  } catch (e) {
    console.error("withDbOptions DB error — using static options for", item.slug, e);
    return item;
  }
}
