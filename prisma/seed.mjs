import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// ---- Category / SizingTier / AttributeKind lookup tables ----
// These replace the old Prisma enums (Category, OptionKind) and the
// hardcoded SIZINGS array. Seeded once; admin can add/hide/relabel rows
// from /admin from here on with zero code changes.
const categories = [
  { key: "FULL_STICK", label: "Full Stick", sortOrder: 0 },
  { key: "GOALIE", label: "Goalie", sortOrder: 1 },
  { key: "MINI_CLUB", label: "Mini Club", sortOrder: 2 },
  { key: "MINI_FUN", label: "Mini Fun", sortOrder: 3 },
];
for (const c of categories) {
  await prisma.category.upsert({ where: { key: c.key }, update: c, create: c });
}

const sizingTiers = [
  { key: "SENIOR", label: "Senior", tag: "Adult & beer league", sortOrder: 0 },
  { key: "INT", label: "Intermediate", tag: "Stepping up to full ice", sortOrder: 1 },
  { key: "JR", label: "Junior", tag: "Growing players", sortOrder: 2 },
  { key: "YTH", label: "Youth", tag: "Little rippers", sortOrder: 3 },
];
for (const t of sizingTiers) {
  await prisma.sizingTier.upsert({ where: { key: t.key }, update: t, create: t });
}

const attributeKinds = [
  { key: "FLEX", label: "Flex", unit: "", sortOrder: 0 },
  { key: "CURVE", label: "Curve", unit: "", sortOrder: 1 },
  { key: "HAND", label: "Hand", unit: "", sortOrder: 2 },
  { key: "COLOR", label: "Color", unit: "", sortOrder: 3 },
  { key: "LENGTH", label: "Length", unit: "\"", sortOrder: 4 },
  { key: "KICK", label: "Kick Point", unit: "", sortOrder: 5 },
  { key: "PADDLE", label: "Paddle Size", unit: "\"", sortOrder: 6 },
];
for (const k of attributeKinds) {
  await prisma.attributeKind.upsert({ where: { key: k.key }, update: k, create: k });
}
console.log(`Seeded ${categories.length} categories, ${sizingTiers.length} sizing tiers, ${attributeKinds.length} attribute kinds.`);

// Retail prices ~40% margin over manufacturer quote (landed cost incl. freight share).
// Slugs/prices/categories mirror lib/catalog.ts — keep them in sync.
// `configurable: true` = storefront builds the flex/curve/hand/color/length
// picker from OptionValue rows scoped by category+sizingTier (see
// lib/options.ts). `specs`/`badge` mirror the static fixture but are now
// admin-editable — DB values win once seeded.
const products = [
  // ---- SENIOR: Elite / Performance / Value ----
  {
    slug: "elite-senior-stick",
    name: "Elite Senior Stick",
    description: "335g T1100 carbon + boron, 24K weave. Our lightest build.",
    category: "FULL_STICK",
    sizingTier: "SENIOR",
    configurable: true,
    badge: "Top Shelf",
    specs: ["335g", "T1100 + boron carbon", "24K weave"],
    priceCents: 11900,
    preorder: true,
  },
  {
    slug: "performance-senior-stick",
    name: "Performance Senior Stick",
    description: "375g full carbon, 18K weave. The workhorse.",
    category: "FULL_STICK",
    sizingTier: "SENIOR",
    configurable: true,
    badge: "Best Seller",
    specs: ["375g", "T1100/T800 carbon", "18K weave"],
    priceCents: 9900,
    preorder: true,
  },
  {
    slug: "value-senior-stick",
    name: "Value Senior Stick",
    description: "425g full carbon, 18K weave. Budget-friendly backup.",
    category: "FULL_STICK",
    sizingTier: "SENIOR",
    configurable: true,
    badge: "Best Value",
    specs: ["425g", "T700 carbon", "18K weave"],
    priceCents: 7900,
    preorder: true,
  },

  // ---- INTERMEDIATE: Elite / Performance / Value ----
  {
    slug: "elite-intermediate-stick",
    name: "Elite Intermediate Stick",
    description: "295g T1100 + boron carbon, 24K weave. INT sizing.",
    category: "FULL_STICK",
    sizingTier: "INT",
    configurable: true,
    badge: "Top Shelf",
    specs: ["295g", "T1100 + boron carbon", "24K weave", "INT sizing"],
    priceCents: 10900,
    preorder: true,
  },
  {
    slug: "performance-intermediate-stick",
    name: "Performance Intermediate Stick",
    description: "335g full carbon, 18K weave. INT sizing.",
    category: "FULL_STICK",
    sizingTier: "INT",
    configurable: true,
    badge: "Best Seller",
    specs: ["335g", "T1100/T800 carbon", "18K weave", "INT sizing"],
    priceCents: 8900,
    preorder: true,
  },
  {
    slug: "value-intermediate-stick",
    name: "Value Intermediate Stick",
    description: "395g full carbon, 18K weave. INT sizing.",
    category: "FULL_STICK",
    sizingTier: "INT",
    configurable: true,
    badge: "Best Value",
    specs: ["395g", "T700 carbon", "18K weave", "INT sizing"],
    priceCents: 6900,
    preorder: true,
  },

  // ---- JUNIOR: Elite / Performance / Value ----
  {
    slug: "elite-junior-stick",
    name: "Elite Junior Stick",
    description: "245g T1100 + boron carbon, 24K weave. JR sizing.",
    category: "FULL_STICK",
    sizingTier: "JR",
    configurable: true,
    badge: "Top Shelf",
    specs: ["245g", "T1100 + boron carbon", "24K weave", "JR sizing"],
    priceCents: 8900,
    preorder: true,
  },
  {
    slug: "performance-junior-stick",
    name: "Performance Junior Stick",
    description: "265g full carbon, 18K weave. JR sizing.",
    category: "FULL_STICK",
    sizingTier: "JR",
    configurable: true,
    badge: "Best Seller",
    specs: ["265g", "T1100/T800 carbon", "18K weave", "JR sizing"],
    priceCents: 6900,
    preorder: true,
  },
  {
    slug: "value-junior-stick",
    name: "Value Junior Stick",
    description: "315g full carbon, 18K weave. JR sizing.",
    category: "FULL_STICK",
    sizingTier: "JR",
    configurable: true,
    badge: "Best Value",
    specs: ["315g", "T700 carbon", "18K weave", "JR sizing"],
    priceCents: 4900,
    preorder: true,
  },

  // ---- YOUTH: Elite / Performance / Value ----
  {
    slug: "elite-youth-stick",
    name: "Elite Youth Stick",
    description: "225g T1100 + boron carbon, 24K weave. YTH sizing.",
    category: "FULL_STICK",
    sizingTier: "YTH",
    configurable: true,
    badge: "Top Shelf",
    specs: ["225g", "T1100 + boron carbon", "24K weave", "YTH sizing"],
    priceCents: 7900,
    preorder: true,
  },
  {
    slug: "performance-youth-stick",
    name: "Performance Youth Stick",
    description: "265g full carbon, 18K weave. YTH sizing.",
    category: "FULL_STICK",
    sizingTier: "YTH",
    configurable: true,
    badge: "Best Seller",
    specs: ["265g", "T1100/T800 carbon", "18K weave", "YTH sizing"],
    priceCents: 5900,
    preorder: true,
  },

  // ---- GOALIE: Elite / Performance (Value discontinued) ----
  // Goalie flex uses the SENIOR flex set (see lib/catalog.ts baseOpts), so
  // sizingTier is SENIOR here too — matches current sizingOf() behavior.
  {
    slug: "elite-goalie-stick",
    name: "Elite Goalie Stick",
    description: "600g full carbon paddle, 24K weave, 21\"-28\" paddle.",
    category: "GOALIE",
    sizingTier: "SENIOR",
    configurable: true,
    badge: "Top Shelf",
    specs: ["600g", "T1100 + boron carbon", "24K weave", "21\"-28\" paddle"],
    priceCents: 14900,
    preorder: true,
  },
  {
    slug: "performance-goalie-stick",
    name: "Performance Goalie Stick",
    description: "800g full carbon paddle, 18K weave, 21\"-28\" paddle.",
    category: "GOALIE",
    sizingTier: "SENIOR",
    configurable: true,
    badge: "Best Seller",
    specs: ["800g", "T1100/T800 carbon", "18K weave", "21\"-28\" paddle"],
    priceCents: 12900,
    preorder: true,
  },

  // ---- IN STOCK: fixed builds, ships now, no batch wait (not configurable) ----
  {
    slug: "instock-senior-85-p92",
    name: "In-Stock Senior — 85 Flex / P92",
    description: "350g, 18K weave, 85 flex, P92 curve, right hand. On the shelf now.",
    category: "FULL_STICK",
    sizingTier: "SENIOR",
    configurable: false,
    badge: "Pick Up Now",
    specs: ["350g", "18K weave", "85 Flex", "P92 curve", "Right hand"],
    priceCents: 9900,
    inStock: 12,
    preorder: false,
  },
  {
    slug: "instock-senior-75-p28",
    name: "In-Stock Senior — 75 Flex / P28",
    description: "350g, 18K weave, 75 flex, P28 curve, right hand. On the shelf now.",
    category: "FULL_STICK",
    sizingTier: "SENIOR",
    configurable: false,
    badge: "Pick Up Now",
    specs: ["350g", "18K weave", "75 Flex", "P28 curve", "Right hand"],
    priceCents: 9900,
    inStock: 12,
    preorder: false,
  },
  {
    slug: "instock-junior-50-p92",
    name: "In-Stock Junior — 50 Flex / P92",
    description: "315g, 18K weave, 50 flex, P92 curve, right hand. On the shelf now.",
    category: "FULL_STICK",
    sizingTier: "JR",
    configurable: false,
    badge: "Pick Up Now",
    specs: ["315g", "18K weave", "50 Flex", "P92 curve", "Right hand"],
    priceCents: 6900,
    inStock: 15,
    preorder: false,
  },

  // ---- MINI STICKS (not configurable) ----
  // One mini per big STL club (MINI_CLUB) + brand Fun Series designs
  // (MINI_FUN). `fixedColor` = the wrap accent color (hex), surfaced by
  // getMergedCatalog as CatalogItem.accent for card/detail art. Mix of
  // in-stock (preorder:false + inStock) and pre-order (preorder:true) —
  // mostly pre-order to keep upfront cost down while inventory is built.
  // All of this is admin-editable: add a club, flip stock, change accent
  // from /admin with zero code changes. Old generic minis
  // (club-custom-mini-stick / fun-series-mini-stick) are auto-deactivated
  // by the notIn cleanup below since they're no longer in this array.
  {
    slug: "affton-mini",
    name: "Affton Mini Stick",
    description: "Affton colors on an 18\" knee-hockey legend. Rep the club, one basement celly at a time.",
    category: "MINI_CLUB",
    clubName: "Affton",
    sizingTier: null,
    configurable: false,
    badge: "Club Favorite",
    specs: ["18\" mini", "Club colors"],
    priceCents: 2799,
    fixedColor: "#1e3a8a",
    inStock: 14,
    preorder: false,
  },
  {
    slug: "kirkwood-mini",
    name: "Kirkwood Mini Stick",
    description: "Kirkwood red-and-black on an 18\" mini. Locker-room bragging rights, guaranteed.",
    category: "MINI_CLUB",
    clubName: "Kirkwood",
    sizingTier: null,
    configurable: false,
    badge: null,
    specs: ["18\" mini", "Club colors"],
    priceCents: 2799,
    fixedColor: "#b91c1c",
    preorder: true,
  },
  {
    slug: "rockets-mini",
    name: "Rockets Mini Stick",
    description: "Rockets blue on an 18\" mini. The gift kids fight over before the tape's even on.",
    category: "MINI_CLUB",
    clubName: "Rockets",
    sizingTier: null,
    configurable: false,
    badge: null,
    specs: ["18\" mini", "Club colors"],
    priceCents: 2799,
    fixedColor: "#1d4ed8",
    preorder: true,
  },
  {
    slug: "st-peters-mini",
    name: "St. Peters Mini Stick",
    description: "St. Peters green on an 18\" mini. Team spirit for the basement rink.",
    category: "MINI_CLUB",
    clubName: "St. Peters",
    sizingTier: null,
    configurable: false,
    badge: null,
    specs: ["18\" mini", "Club colors"],
    priceCents: 2799,
    fixedColor: "#15803d",
    preorder: true,
  },
  {
    slug: "meramec-mini",
    name: "Meramec Mini Stick",
    description: "Meramec teal on an 18\" mini. Knee-hockey ready, club-proud.",
    category: "MINI_CLUB",
    clubName: "Meramec",
    sizingTier: null,
    configurable: false,
    badge: null,
    specs: ["18\" mini", "Club colors"],
    priceCents: 2799,
    fixedColor: "#0f766e",
    preorder: true,
  },
  {
    slug: "chesterfield-mini",
    name: "Chesterfield Mini Stick",
    description: "Chesterfield purple on an 18\" mini. The carpet-slapshot MVP.",
    category: "MINI_CLUB",
    clubName: "Chesterfield",
    sizingTier: null,
    configurable: false,
    badge: "Club Favorite",
    specs: ["18\" mini", "Club colors"],
    priceCents: 2799,
    fixedColor: "#6d28d9",
    inStock: 9,
    preorder: false,
  },
  {
    slug: "fun-series-neon",
    name: "Fun Series — Neon",
    description: "Volt-green loud. The brightest thing in the basement, tape included.",
    category: "MINI_FUN",
    sizingTier: null,
    configurable: false,
    badge: "Best Seller",
    specs: ["18\" mini", "Loud graphics"],
    priceCents: 2799,
    fixedColor: "#b8e62e",
    inStock: 20,
    preorder: false,
  },
  {
    slug: "fun-series-camo",
    name: "Fun Series — Camo",
    description: "Camo wrap for the sniper who plays it low-key — until the celly.",
    category: "MINI_FUN",
    sizingTier: null,
    configurable: false,
    badge: null,
    specs: ["18\" mini", "Loud graphics"],
    priceCents: 2799,
    fixedColor: "#4d7c0f",
    preorder: true,
  },
  {
    slug: "fun-series-galaxy",
    name: "Fun Series — Galaxy",
    description: "Deep-space purple wrap. Out-of-this-world knee-hockey energy.",
    category: "MINI_FUN",
    sizingTier: null,
    configurable: false,
    badge: null,
    specs: ["18\" mini", "Loud graphics"],
    priceCents: 2799,
    fixedColor: "#7c3aed",
    preorder: true,
  },
];

// Locked builds for the IN_STOCK catalog (display only, no customization).
const FIXED_BUILD = {
  "instock-senior-85-p92": { fixedFlex: 85, fixedCurve: "P92", fixedHand: "Right", fixedLength: '60"' },
  "instock-senior-75-p28": { fixedFlex: 75, fixedCurve: "P28", fixedHand: "Right", fixedLength: '60"' },
  "instock-junior-50-p92": { fixedFlex: 50, fixedCurve: "P92", fixedHand: "Right", fixedLength: '54"' },
};

for (const p of products) {
  // Derive the two-catalog type from the legacy preorder flag.
  const type = p.preorder === false ? "IN_STOCK" : "PREORDER";
  const data = { ...p, type, ...(FIXED_BUILD[p.slug] ?? {}) };
  await prisma.product.upsert({
    where: { slug: p.slug },
    update: data,
    create: data,
  });
}

// Retire the goalie in-stock SKU if a prior seed created it (senior + junior only to start).
await prisma.product.updateMany({
  where: { slug: "instock-goalie-26-paddle" },
  data: { active: false, inStock: 0 },
});

// ---- Option catalog (admin-editable) ----
// Seeded from the defaults that used to live in lib/catalog.ts. Admin can
// add/edit/deactivate these from /admin. `sizing` scopes tier-specific sets.
const optionValues = [];
const pushOpt = (kind, values, extra = {}) =>
  values.forEach((v, i) =>
    optionValues.push({
      kind,
      value: String(v),
      sizing: extra.sizing ?? "ALL",
      category: extra.category ?? "ALL",
      upchargeCents: extra.upchargeCents ?? 0,
      isDefault: extra.defaultValue != null ? String(extra.defaultValue) === String(v) : false,
      sortOrder: i,
    })
  );

// Flex — per sizing tier. Senior is scoped FULL_STICK so goalie doesn't borrow
// it; goalie gets its own set (matches the official size table).
pushOpt("FLEX", [65, 75, 85, 95, 102, 110, 112], { sizing: "SENIOR", category: "FULL_STICK", defaultValue: 85 });
pushOpt("FLEX", [45, 50, 55, 60, 65], { sizing: "INT", defaultValue: 55 });
pushOpt("FLEX", [35, 40, 45, 50, 55], { sizing: "JR", defaultValue: 45 });
pushOpt("FLEX", [20, 25, 30, 35], { sizing: "YTH", defaultValue: 30 });
pushOpt("FLEX", [65, 70, 75, 80, 85, 90, 95, 102], { category: "GOALIE", defaultValue: 85 });

// Curve — tier-scoped: Senior/Int get the full set, Junior/Youth get P92/P28.
const FULL_CURVES = ["P92", "P28", "P88", "P92M", "PM9", "P02", "P90TM", "P91A"];
pushOpt("CURVE", FULL_CURVES, { sizing: "SENIOR", category: "FULL_STICK", defaultValue: "P92" });
pushOpt("CURVE", FULL_CURVES, { sizing: "INT", category: "FULL_STICK", defaultValue: "P92" });
pushOpt("CURVE", ["P92", "P28"], { sizing: "JR", category: "FULL_STICK", defaultValue: "P92" });
pushOpt("CURVE", ["P92", "P28"], { sizing: "YTH", category: "FULL_STICK", defaultValue: "P92" });
// Goalie curve — all goalie sticks are P31
pushOpt("CURVE", ["P31"], { category: "GOALIE", defaultValue: "P31" });

// Hand
pushOpt("HAND", ["Right", "Left"], { defaultValue: "Right" });

// Color — all colors included, no upcharge. Black is the default.
["Black", "Red", "Golden", "Transparent Blue", "Navy Blue", "Green", "Brown", "Purple", "Pink"].forEach(
  (c, i) =>
    optionValues.push({
      kind: "COLOR",
      value: c,
      sizing: "ALL",
      category: "ALL",
      upchargeCents: 0,
      isDefault: i === 0,
      sortOrder: i,
    })
);

// Length — per tier, from the official size table (inches).
pushOpt("LENGTH", ['66"', '68"', '70"'], { sizing: "SENIOR", defaultValue: '68"' });
pushOpt("LENGTH", ['63"', '61"', '59"'], { sizing: "INT", defaultValue: '61"' });
pushOpt("LENGTH", ['57"', '55"', '53"'], { sizing: "JR", defaultValue: '55"' });
pushOpt("LENGTH", ['51"', '49"', '47"'], { sizing: "YTH", defaultValue: '49"' });

// Kick point — per tier, from the supplier's "bending point" spec sheet.
// Senior/Int mid-weights ship medium/low; Junior/Youth premiums ship high/mid.
pushOpt("KICK", ["Low", "Mid"], { sizing: "SENIOR", category: "FULL_STICK", defaultValue: "Mid" });
pushOpt("KICK", ["Low", "Mid"], { sizing: "INT", category: "FULL_STICK", defaultValue: "Mid" });
pushOpt("KICK", ["Mid", "High"], { sizing: "JR", category: "FULL_STICK", defaultValue: "Mid" });
pushOpt("KICK", ["Mid", "High"], { sizing: "YTH", category: "FULL_STICK", defaultValue: "Mid" });
pushOpt("KICK", ["Low", "Mid"], { category: "GOALIE", defaultValue: "Mid" });

// Paddle size — goalie only, 21"-28" in 1" increments
pushOpt("PADDLE", ['21"', '22"', '23"', '24"', '25"', '26"', '27"', '28"'], {
  category: "GOALIE",
  defaultValue: '26"',
});

for (const ov of optionValues) {
  await prisma.optionValue.upsert({
    where: {
      kind_value_sizing_category: {
        kind: ov.kind,
        value: ov.value,
        sizing: ov.sizing,
        category: ov.category,
      },
    },
    update: ov,
    create: ov,
  });
}
console.log(`Seeded ${optionValues.length} option values.`);

// Deactivate goalie option rows no longer offered (old 30" paddle, 31-L curve)
const goalieKeep = (kind) =>
  optionValues.filter((o) => o.kind === kind && o.category === "GOALIE").map((o) => o.value);
await prisma.optionValue.updateMany({
  where: { category: "GOALIE", kind: "PADDLE", value: { notIn: goalieKeep("PADDLE") } },
  data: { active: false },
});
await prisma.optionValue.updateMany({
  where: { category: "GOALIE", kind: "CURVE", value: { notIn: goalieKeep("CURVE") } },
  data: { active: false },
});

// Retire any old slugs no longer sold
await prisma.product.updateMany({
  where: { slug: { notIn: products.map((p) => p.slug) } },
  data: { active: false },
});

// Open batch: cutoff = 1st of next month. Allow ~2 weeks for shipping,
// so pickup is estimated 14-18 days after cutoff.
const now = new Date();
const cutoff = new Date(now.getFullYear(), now.getMonth() + 1, 1);
const pickupStart = new Date(cutoff.getFullYear(), cutoff.getMonth(), cutoff.getDate() + 14);
const pickupEnd = new Date(cutoff.getFullYear(), cutoff.getMonth(), cutoff.getDate() + 18);
const name = `${cutoff.toLocaleString("en-US", { month: "long", year: "numeric" })} Batch`;

const existing = await prisma.batch.findFirst({ where: { status: "OPEN" } });
if (!existing) {
  await prisma.batch.create({
    data: { name, cutoffDate: cutoff, pickupStart, pickupEnd },
  });
}

console.log("Seeded products + open batch.");
await prisma.$disconnect();
