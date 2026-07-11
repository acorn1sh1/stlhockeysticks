// Static catalog + option config. Source of truth for valid options;
// server re-prices and re-validates at checkout. Mirrors prisma/seed.mjs.

export type StickOptions = {
  flex: number[];
  curve: string[];
  hand: string[];
  colors: string[]; // first = standard (no upcharge)
  length?: string[]; // 3 per tier (Senior/Int/Jr); omitted for goalie/youth
  colorUpchargeCents: number;
  nameUpchargeCents: number; // custom name printing on shaft
  paddleSize?: string[]; // goalie only
  // Pre-selected defaults sourced from the option catalog (isDefault rows).
  defaults?: Partial<{ flex: number; curve: string; hand: string; color: string; length: string; paddleSize: string }>;
};

export type CatalogItem = {
  slug: string;
  name: string;
  description: string;
  // Was a 4-value literal union; now a plain string. Category is admin-
  // extensible (DB `Category` table, see prisma/schema.prisma) so new
  // categories can be added with no code change — code that keys off a
  // specific value (e.g. "GOALIE") still works fine via string equality.
  category: string;
  // SENIOR | INT | JR | YTH — explicit tier scope for configurable items,
  // sourced from Product.sizingTier. Undefined on static-fallback items
  // (falls back to slug-substring guessing via `sizingOf`, see below).
  sizingTier?: string;
  priceCents: number;
  badge?: string;
  specs?: string[];
  options?: StickOptions;
  // Catalog-level "ships now, no batch wait" flag. Distinct from Prisma's
  // Product.inStock (on-hand unit count) — this is a display/grouping flag.
  inStock?: boolean;
  // Locked build for IN_STOCK SKUs, surfaced from Product.fixed* so the
  // in-stock listing can sort/filter on real per-SKU attributes. Undefined
  // on pre-order (built-to-order) items.
  fixed?: {
    flex?: number;
    curve?: string;
    hand?: string;
    color?: string;
    length?: string;
  };
  // On-hand unit count (Product.inStock) for IN_STOCK SKUs — used for the
  // "only X left" cue and availability sort/filter. Undefined otherwise.
  stockCount?: number;
  // Wrap accent color (hex/name) sourced from Product.fixedColor,
  // populated for ALL types (not just IN_STOCK). Used to tint the mini
  // stick card + detail art. Undefined when no color is set.
  accent?: string;
};

// Minimal non-empty-looking shell so a DB product with `configurable: true`
// but no static CATALOG counterpart still gets an `options` object (and so
// `withDbOptions` doesn't bail out before overlaying the real OptionValue
// rows). Never shown to a shopper as-is — see lib/options.ts guard.
export const EMPTY_OPTIONS: StickOptions = {
  flex: [],
  curve: [],
  hand: [],
  colors: [],
  colorUpchargeCents: 1000,
  nameUpchargeCents: 1000,
};

export const COLORS = [
  "Black",
  "Red",
  "Golden",
  "Transparent Blue",
  "Navy Blue",
  "Green",
  "Brown",
  "Purple",
  "Silver",
];

const CURVES_FULL = ["P92", "P28", "P88", "P92M", "PM9", "P02", "P90TM", "P91A"];
const CURVES_YOUTH = ["P92", "P28"];
const HANDS = ["Right", "Left"];
const PADDLE_SIZES = ['21"', '22"', '23"', '24"', '25"', '26"', '27"', '28"'];

const FLEX_SENIOR = [65, 70, 75, 80, 85, 90, 95, 102];
const FLEX_INT = [45, 50, 55, 60, 65];
const FLEX_JR = [35, 40, 45, 50, 55];
const FLEX_YTH = [20, 25, 30, 35];
const FLEX_GOALIE = [65, 70, 75, 80, 85, 90, 95, 102];

const baseOpts = {
  colors: COLORS,
  colorUpchargeCents: 1000,
  nameUpchargeCents: 1000,
  hand: HANDS,
};

export const CATALOG: CatalogItem[] = [
  // ---- SENIOR: Elite / Performance / Value ----
  {
    slug: "elite-senior-stick",
    name: "Elite Senior Stick",
    description:
      "Our lightest twig — 315g of T1100 carbon, boron fiber, and a 24K weave that doesn't quit. Beauty mitts not required; this stick makes you look better than you are.",
    category: "FULL_STICK",
    priceCents: 11900,
    badge: "Top Shelf",
    specs: ["315g", "T1100 + boron carbon", "24K weave", "High/Mid/Low kick"],
    options: { ...baseOpts, flex: FLEX_SENIOR, curve: CURVES_FULL },
  },
  {
    slug: "performance-senior-stick",
    name: "Performance Senior Stick",
    description:
      "350g full-carbon workhorse with 18K weave. Pro-shop feel at a beer-league price — the most popular blade in the room, bar down ready right out of the wrapper.",
    category: "FULL_STICK",
    priceCents: 9900,
    badge: "Best Seller",
    specs: ["350g", "T1100/T800 carbon", "18K weave", "Mid kick"],
    options: { ...baseOpts, flex: FLEX_SENIOR, curve: CURVES_FULL },
  },
  {
    slug: "value-senior-stick",
    name: "Value Senior Stick",
    description:
      "425g full-carbon build. A little more heft, a lot less money — the perfect backup twig or your first real composite. Bender-proof flex, no shame in the tank.",
    category: "FULL_STICK",
    priceCents: 7900,
    badge: "Best Value",
    specs: ["425g", "T700 carbon", "18K weave", "Mid kick"],
    options: { ...baseOpts, flex: FLEX_SENIOR, curve: CURVES_FULL },
  },

  // ---- INTERMEDIATE: Elite / Performance / Value ----
  {
    slug: "elite-intermediate-stick",
    name: "Elite Intermediate Stick",
    description:
      "Same 315g T1100-plus-boron build as our Elite Senior, sized down for players stepping up. Bender-proof flex, bar-down-ready blade — your shelves called, they want a beauty.",
    category: "FULL_STICK",
    priceCents: 10900,
    badge: "Top Shelf",
    specs: ["315g", "T1100 + boron carbon", "24K weave", "High/Mid/Low kick", "INT sizing"],
    options: { ...baseOpts, flex: FLEX_INT, curve: CURVES_FULL },
  },
  {
    slug: "performance-intermediate-stick",
    name: "Performance Intermediate Stick",
    description:
      "335g full-carbon INT stick built for growing shots and Saturday-morning cellys. The workhorse pick for the jump to full-size ice.",
    category: "FULL_STICK",
    priceCents: 8900,
    badge: "Best Seller",
    specs: ["335g", "T1100/T800 carbon", "18K weave", "Mid kick", "INT sizing"],
    options: { ...baseOpts, flex: FLEX_INT, curve: CURVES_FULL },
  },
  {
    slug: "value-intermediate-stick",
    name: "Value Intermediate Stick",
    description:
      "370g full-carbon INT build. Budget twig, zero excuses — takes the abuse of stepping-up season without taking your allowance.",
    category: "FULL_STICK",
    priceCents: 6900,
    badge: "Best Value",
    specs: ["370g", "T700 carbon", "18K weave", "Mid kick", "INT sizing"],
    options: { ...baseOpts, flex: FLEX_INT, curve: CURVES_FULL },
  },

  // ---- JUNIOR: Elite / Performance / Value ----
  {
    slug: "elite-junior-stick",
    name: "Elite Junior Stick",
    description:
      "295g full-carbon JR build, same 24K weave as the big leagues. Light enough for developing snipes, tough enough for driveway abuse.",
    category: "FULL_STICK",
    priceCents: 8900,
    badge: "Top Shelf",
    specs: ["295g", "T1100 + boron carbon", "24K weave", "High/Mid/Low kick", "JR sizing"],
    options: { ...baseOpts, flex: FLEX_JR, curve: CURVES_YOUTH },
  },
  {
    slug: "performance-junior-stick",
    name: "Performance Junior Stick",
    description:
      "315g full-carbon JR workhorse. The stick that survives basement one-timers and actual games — celly-worthy the day it comes out of the batch.",
    category: "FULL_STICK",
    priceCents: 6900,
    badge: "Best Seller",
    specs: ["315g", "T1100/T800 carbon", "18K weave", "Mid kick", "JR sizing"],
    options: { ...baseOpts, flex: FLEX_JR, curve: CURVES_YOUTH },
  },
  {
    slug: "value-junior-stick",
    name: "Value Junior Stick",
    description:
      "345g full-carbon JR build. Solid backup twig so the good one stays in the bag until game day.",
    category: "FULL_STICK",
    priceCents: 4900,
    badge: "Best Value",
    specs: ["345g", "T700 carbon", "18K weave", "Mid kick", "JR sizing"],
    options: { ...baseOpts, flex: FLEX_JR, curve: CURVES_YOUTH },
  },

  // ---- YOUTH: Elite / Performance / Value ----
  {
    slug: "elite-youth-stick",
    name: "Elite Youth Stick",
    description:
      "215g feather-light full-carbon build. Real construction, kid-sized flex — not a toy-store special.",
    category: "FULL_STICK",
    priceCents: 7900,
    badge: "Top Shelf",
    specs: ["215g", "T1100 + boron carbon", "24K weave", "High/Mid/Low kick", "YTH sizing"],
    options: { ...baseOpts, flex: FLEX_YTH, curve: CURVES_YOUTH },
  },
  {
    slug: "performance-youth-stick",
    name: "Performance Youth Stick",
    description:
      "245g full-carbon YTH stick. Built to keep up with a kid who just discovered they can actually shoot.",
    category: "FULL_STICK",
    priceCents: 5900,
    badge: "Best Seller",
    specs: ["245g", "T1100/T800 carbon", "18K weave", "Mid kick", "YTH sizing"],
    options: { ...baseOpts, flex: FLEX_YTH, curve: CURVES_YOUTH },
  },
  {
    slug: "value-youth-stick",
    name: "Value Youth Stick",
    description:
      "275g full-carbon YTH build. Tough enough for driveway hockey, priced so losing it in the yard doesn't hurt.",
    category: "FULL_STICK",
    priceCents: 3900,
    badge: "Best Value",
    specs: ["275g", "T700 carbon", "18K weave", "Mid kick", "YTH sizing"],
    options: { ...baseOpts, flex: FLEX_YTH, curve: CURVES_YOUTH },
  },

  // ---- GOALIE: Elite / Performance / Value ----
  {
    slug: "elite-goalie-stick",
    name: "Elite Goalie Stick",
    description:
      "450g full-carbon paddle, the lightest build we stock. Your glove hand called — it wants this stick.",
    category: "GOALIE",
    priceCents: 14900,
    badge: "Top Shelf",
    specs: ["450g", "T1100 + boron carbon", "24K weave", "21\"-28\" paddle"],
    options: { ...baseOpts, flex: FLEX_GOALIE, curve: ["P31"], paddleSize: PADDLE_SIZES },
  },
  {
    slug: "performance-goalie-stick",
    name: "Performance Goalie Stick",
    description:
      "480g full-carbon workhorse paddle. Because goalies deserve wholesale prices too — bar down still counts even if you're the one letting it in.",
    category: "GOALIE",
    priceCents: 12900,
    badge: "Best Seller",
    specs: ["480g", "T1100/T800 carbon", "18K weave", "21\"-28\" paddle"],
    options: { ...baseOpts, flex: FLEX_GOALIE, curve: ["P31"], paddleSize: PADDLE_SIZES },
  },
  {
    slug: "value-goalie-stick",
    name: "Value Goalie Stick",
    description:
      "520g full-carbon paddle. Backup between the pipes shouldn't cost like a starter.",
    category: "GOALIE",
    priceCents: 10900,
    badge: "Best Value",
    specs: ["520g", "T700 carbon", "18K weave", "21\"-28\" paddle"],
    options: { ...baseOpts, flex: FLEX_GOALIE, curve: ["P31"], paddleSize: PADDLE_SIZES },
  },

  // ---- IN STOCK: fixed flex+curve combos, ships now, no batch wait ----
  {
    slug: "instock-senior-85-p92",
    name: "In-Stock Senior — 85 Flex / P92",
    description:
      "Grab-and-go senior twig, 85 flex, P92 curve, built and sitting on the shelf. No batch, no wait — walk in, walk out, go snipe.",
    category: "FULL_STICK",
    priceCents: 9900,
    badge: "Pick Up Now",
    specs: ["350g", "18K weave", "85 Flex", "P92 curve", "Right hand"],
    inStock: true,
  },
  {
    slug: "instock-senior-75-p28",
    name: "In-Stock Senior — 75 Flex / P28",
    description:
      "Same deal, softer flex, P28 curve. Ready on the shelf right now for the whippy-shot crowd.",
    category: "FULL_STICK",
    priceCents: 9900,
    badge: "Pick Up Now",
    specs: ["350g", "18K weave", "75 Flex", "P28 curve", "Right hand"],
    inStock: true,
  },
  {
    slug: "instock-junior-50-p92",
    name: "In-Stock Junior — 50 Flex / P92",
    description:
      "The most popular junior combo, sitting on the shelf today. No pre-order needed, no cutoff to watch.",
    category: "FULL_STICK",
    priceCents: 6900,
    badge: "Pick Up Now",
    specs: ["315g", "18K weave", "50 Flex", "P92 curve", "Right hand"],
    inStock: true,
  },

  // ---- MINI STICKS ----
  {
    slug: "club-custom-mini-stick",
    name: "Club Custom Mini Stick",
    description:
      "Your club's colors and logo on an 18\" knee-hockey legend. Rally your team, one basement celly at a time.",
    category: "MINI_CLUB",
    priceCents: 2799,
    badge: "Club Favorite",
  },
  {
    slug: "fun-series-mini-stick",
    name: "Fun Series Mini Stick",
    description:
      "Wild graphics, loud colors — the basement-hockey classic kids fight over before the tape's even on.",
    category: "MINI_FUN",
    priceCents: 2799,
  },
];

export const fmtPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;

// Sizing tier for scoping tier-specific option values (flex, length).
export type SizingTier = "SENIOR" | "INT" | "JR" | "YTH";
export function sizingOf(slug: string): SizingTier {
  if (slug.includes("intermediate")) return "INT";
  if (slug.includes("junior")) return "JR";
  if (slug.includes("youth")) return "YTH";
  return "SENIOR";
}

export type SelectedOptions = {
  flex?: string;
  curve?: string;
  hand?: string;
  color?: string;
  length?: string;
  customName?: string;
  paddleSize?: string;
};

// Shared pricing logic — used by client preview AND server checkout.
export function unitPriceCents(item: CatalogItem, sel?: SelectedOptions) {
  let price = item.priceCents;
  if (item.options && sel) {
    if (sel.color && sel.color !== item.options.colors[0])
      price += item.options.colorUpchargeCents;
    if (sel.customName?.trim()) price += item.options.nameUpchargeCents;
  }
  return price;
}

// Server-side validation: reject anything not in the config.
export function validateOptions(
  item: CatalogItem,
  sel: SelectedOptions | undefined
): string | null {
  if (!item.options) return null; // minis + in-stock items: no configurable options
  if (!sel) return "Missing options";
  const o = item.options;
  if (!sel.flex || !o.flex.includes(Number(sel.flex))) return "Invalid flex";
  if (!sel.curve || !o.curve.includes(sel.curve)) return "Invalid curve";
  if (!sel.hand || !o.hand.includes(sel.hand)) return "Invalid hand";
  if (sel.color && !o.colors.includes(sel.color)) return "Invalid color";
  if (o.length && (!sel.length || !o.length.includes(sel.length)))
    return "Invalid length";
  if (o.paddleSize && (!sel.paddleSize || !o.paddleSize.includes(sel.paddleSize)))
    return "Invalid paddle size";
  if (sel.customName && sel.customName.length > 20)
    return "Name too long (max 20 chars)";
  return null;
}

export function optionsSummary(sel?: SelectedOptions) {
  if (!sel) return "";
  const parts = [
    sel.flex && `${sel.flex} flex`,
    sel.curve,
    sel.hand,
    sel.length && `${sel.length} length`,
    sel.paddleSize && `${sel.paddleSize} paddle`,
    sel.color && sel.color !== "Black" ? sel.color : null,
    sel.customName?.trim() ? `"${sel.customName.trim()}"` : null,
  ].filter(Boolean);
  return parts.join(" · ");
}

// Monthly batch logic (display only — real batches live in DB)
// Cutoff is always the 1st of next month (computed live off `now`, so this
// rolls forward automatically — never hardcode a date here). After cutoff:
// 1 month to manufacture, then ~2 weeks to ship, giving a pickup window.
export function nextBatch() {
  const now = new Date();
  const cutoff = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const manufactureDone = new Date(cutoff.getFullYear(), cutoff.getMonth() + 1, cutoff.getDate());
  const pickupStart = new Date(
    manufactureDone.getFullYear(),
    manufactureDone.getMonth(),
    manufactureDone.getDate() + 14
  );
  const pickupEnd = new Date(
    manufactureDone.getFullYear(),
    manufactureDone.getMonth(),
    manufactureDone.getDate() + 18
  );
  const daysLeft = Math.max(
    0,
    Math.ceil((cutoff.getTime() - now.getTime()) / 86400000)
  );
  return { cutoff, manufactureDone, pickupStart, pickupEnd, daysLeft };
}

// Club bulk incentive: 10% donated back to the team once a club order
// passes 20 sticks. Was tied to a single generic "club-custom-mini-stick"
// SKU; now that each club has its own mini it's category-based — any mix of
// MINI_CLUB minis counts toward the 20. The old slug is still honored as a
// fallback so historical/mocked lines without a category keep working.
export const CLUB_STICK_SLUG = "club-custom-mini-stick";
export const CLUB_CATEGORY = "MINI_CLUB";
export const CLUB_DISCOUNT_THRESHOLD = 20;
export const CLUB_DISCOUNT_RATE = 0.1;

export function clubDiscountCents(
  lines: { slug: string; quantity: number; priceCents: number; category?: string }[]
) {
  const clubLines = lines.filter(
    (l) => l.category === CLUB_CATEGORY || l.slug === CLUB_STICK_SLUG
  );
  const qty = clubLines.reduce((n, l) => n + l.quantity, 0);
  if (qty <= CLUB_DISCOUNT_THRESHOLD) return 0;
  const clubSubtotal = clubLines.reduce((n, l) => n + l.priceCents * l.quantity, 0);
  return Math.round(clubSubtotal * CLUB_DISCOUNT_RATE);
}

// ---- First-Batch Launch bulk discount ----------------------------------
// Limited-time launch promo: stack more sticks into the first batch, save
// more. Auto-applies (no code) to built-to-order full sticks + goalie sticks
// by TOTAL stick quantity. Excludes minis (own club discount) and in-stock
// SKUs (not part of a batch). Deadline is the *order-by* cutoff — Aug 1 2026,
// end of day Central (Aug 2 05:00 UTC / CDT). Re-computed server-side at
// checkout so a client can never fake the tier or beat the deadline.
export const BATCH_DISCOUNT_DEADLINE = new Date("2026-08-02T05:00:00Z");
export const BATCH_DISCOUNT_CATEGORIES = ["FULL_STICK", "GOALIE"];
export const BATCH_DISCOUNT_TIERS = [
  { minQty: 10, percent: 25 },
  { minQty: 5, percent: 20 },
  { minQty: 2, percent: 10 },
]; // highest threshold first — first match wins

// Percent off for a given stick quantity (0 if below the lowest tier).
export function batchDiscountPercent(qty: number): number {
  return BATCH_DISCOUNT_TIERS.find((t) => qty >= t.minQty)?.percent ?? 0;
}

export function batchDiscountActive(now: Date = new Date()): boolean {
  return now.getTime() < BATCH_DISCOUNT_DEADLINE.getTime();
}

// Stick lines that count toward the launch discount (built-to-order full
// sticks + goalie; minis and in-stock "instock-*" SKUs excluded).
function batchEligibleLines<
  T extends { slug: string; quantity: number; priceCents: number; category?: string }
>(lines: T[]): T[] {
  return lines.filter(
    (l) =>
      !l.slug.startsWith("instock-") &&
      l.category != null &&
      BATCH_DISCOUNT_CATEGORIES.includes(l.category)
  );
}

// Total eligible stick quantity — drives the tier + "add N more to save" cues.
export function batchDiscountQty(
  lines: { slug: string; quantity: number; priceCents: number; category?: string }[]
): number {
  return batchEligibleLines(lines).reduce((n, l) => n + l.quantity, 0);
}

export function batchDiscountCents(
  lines: { slug: string; quantity: number; priceCents: number; category?: string }[],
  now: Date = new Date()
): number {
  if (!batchDiscountActive(now)) return 0;
  const sticks = batchEligibleLines(lines);
  const qty = sticks.reduce((n, l) => n + l.quantity, 0);
  const percent = batchDiscountPercent(qty);
  if (!percent) return 0;
  const subtotal = sticks.reduce((n, l) => n + l.priceCents * l.quantity, 0);
  return Math.round((subtotal * percent) / 100);
}
