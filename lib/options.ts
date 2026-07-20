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

// Phase 2: per-product option overrides, keyed by product slug → kind → rows.
// Loaded in one query and cached alongside the global option set. When a slug
// has rows for a kind, those REPLACE the scoped set for that kind (see
// optionsFromRows). Most products have no overrides, so this is usually empty.
let ovCache: { at: number; bySlug: Map<string, Map<string, Row[]>> } | null = null;

async function loadOverrides(): Promise<Map<string, Map<string, Row[]>>> {
  if (ovCache && Date.now() - ovCache.at < TTL_MS) return ovCache.bySlug;
  const rows = await prisma.productOption.findMany({
    where: { optionValue: { active: true } },
    include: { optionValue: true, product: { select: { slug: true } } },
  });
  const bySlug = new Map<string, Map<string, Row[]>>();
  for (const r of rows) {
    const ov = r.optionValue;
    const byKind = bySlug.get(r.product.slug) ?? new Map<string, Row[]>();
    const arr = byKind.get(ov.kind) ?? [];
    arr.push({
      kind: ov.kind,
      value: ov.value,
      label: ov.label,
      sizing: ov.sizing,
      category: ov.category,
      upchargeCents: ov.upchargeCents,
      isDefault: ov.isDefault,
      sortOrder: ov.sortOrder,
    });
    byKind.set(ov.kind, arr);
    bySlug.set(r.product.slug, byKind);
  }
  ovCache = { at: Date.now(), bySlug };
  return bySlug;
}

export function invalidateOptionCache() {
  cache = null;
  ovCache = null;
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
// `override` (Phase 2): kind → pinned rows for this specific product. When a
// kind is present, its rows replace the tier/category-scoped set for that kind.
export function optionsFromRows(
  item: CatalogItem,
  rows: Row[],
  override?: Map<string, Row[]>
): StickOptions {
  // Prefer the explicit Product.sizingTier (set by admin / seed); fall back
  // to the slug-substring guess only for static-fallback items that never
  // got a DB row (offline mode, or a static CATALOG entry with no DB match).
  const tier = item.sizingTier ?? sizingOf(item.slug);
  const cat = item.category;
  const isGoalie = cat === "GOALIE";

  // Per-kind resolver: use the product's pinned override rows if it has any
  // for that kind, otherwise the scoped shared set.
  const pick = (kind: string) => {
    const o = override?.get(kind);
    return o && o.length ? o : scoped(rows, kind, tier, cat);
  };

  const flexRows = pick("FLEX");
  const curveRows = pick("CURVE");
  const handRows = pick("HAND");
  const colorRows = pick("COLOR");
  const lengthRows = pick("LENGTH");
  const kickRows = pick("KICK");
  const paddleRows = pick("PADDLE");

  // Color upcharge preserves current pricing model: first color = standard,
  // others flat upcharge (taken from the first non-zero color row).
  // Flat color upcharge = the first color that carries one. If NO color has an
  // upcharge, color is free (fallback 0) — no phantom charge.
  const colorUpchargeCents = colorRows.find((r) => r.upchargeCents > 0)?.upchargeCents ?? 0;

  return {
    flex: flexRows.map((r) => Number(r.value)),
    curve: curveRows.map((r) => r.value),
    hand: handRows.map((r) => r.value),
    colors: colorRows.map((r) => r.value),
    length: !isGoalie && lengthRows.length ? lengthRows.map((r) => r.value) : undefined,
    kick: kickRows.length ? kickRows.map((r) => r.value) : undefined,
    paddleSize: isGoalie && paddleRows.length ? paddleRows.map((r) => r.value) : undefined,
    colorUpchargeCents,
    nameUpchargeCents: NAME_UPCHARGE_CENTS,
    defaults: {
      flex: firstDefault(flexRows) != null ? Number(firstDefault(flexRows)) : undefined,
      curve: firstDefault(curveRows),
      hand: firstDefault(handRows),
      color: firstDefault(colorRows),
      length: isGoalie ? undefined : firstDefault(lengthRows),
      kick: firstDefault(kickRows),
      paddleSize: firstDefault(paddleRows),
    },
  };
}

// Standard colors for plain (non-configurable) minis — the active COLOR rows
// scoped to the given category (rows with category ALL apply too). Admin adds/
// removes colors from the Pre-Order Options table; no code change needed.
// Returns [] on DB failure so callers can hide the picker gracefully.
export async function getStandardColors(category: string): Promise<string[]> {
  try {
    const rows = await loadRows();
    return scoped(rows, "COLOR", "", category).map((r) => r.value);
  } catch (e) {
    console.error("getStandardColors DB error", e);
    return [];
  }
}

// Merge DB-sourced options onto a pre-order catalog item. Returns the item
// unchanged if it isn't configurable, or if the DB yields no usable options.
export async function withDbOptions(item: CatalogItem): Promise<CatalogItem> {
  if (!item.options) return item; // minis + in-stock: nothing to configure
  try {
    const [rows, bySlug] = await Promise.all([loadRows(), loadOverrides()]);
    const opts = optionsFromRows(item, rows, bySlug.get(item.slug));
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
