import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// Retail prices ~40% margin over manufacturer quote (landed cost incl. freight share).
// Slugs/prices/categories mirror lib/catalog.ts — keep them in sync.
const products = [
  // ---- SENIOR: Elite / Performance / Value ----
  {
    slug: "elite-senior-stick",
    name: "Elite Senior Stick",
    description: "315g T1100 carbon + boron, 24K weave. Our lightest build.",
    category: "FULL_STICK",
    priceCents: 11900,
    preorder: true,
  },
  {
    slug: "performance-senior-stick",
    name: "Performance Senior Stick",
    description: "350g full carbon, 18K weave. The workhorse.",
    category: "FULL_STICK",
    priceCents: 9900,
    preorder: true,
  },
  {
    slug: "value-senior-stick",
    name: "Value Senior Stick",
    description: "425g full carbon, 18K weave. Budget-friendly backup.",
    category: "FULL_STICK",
    priceCents: 7900,
    preorder: true,
  },

  // ---- INTERMEDIATE: Elite / Performance / Value ----
  {
    slug: "elite-intermediate-stick",
    name: "Elite Intermediate Stick",
    description: "315g T1100 + boron carbon, 24K weave. INT sizing.",
    category: "FULL_STICK",
    priceCents: 10900,
    preorder: true,
  },
  {
    slug: "performance-intermediate-stick",
    name: "Performance Intermediate Stick",
    description: "335g full carbon, 18K weave. INT sizing.",
    category: "FULL_STICK",
    priceCents: 8900,
    preorder: true,
  },
  {
    slug: "value-intermediate-stick",
    name: "Value Intermediate Stick",
    description: "370g full carbon, 18K weave. INT sizing.",
    category: "FULL_STICK",
    priceCents: 6900,
    preorder: true,
  },

  // ---- JUNIOR: Elite / Performance / Value ----
  {
    slug: "elite-junior-stick",
    name: "Elite Junior Stick",
    description: "295g full carbon, 24K weave. JR sizing.",
    category: "FULL_STICK",
    priceCents: 8900,
    preorder: true,
  },
  {
    slug: "performance-junior-stick",
    name: "Performance Junior Stick",
    description: "315g full carbon, 18K weave. JR sizing.",
    category: "FULL_STICK",
    priceCents: 6900,
    preorder: true,
  },
  {
    slug: "value-junior-stick",
    name: "Value Junior Stick",
    description: "345g full carbon, 18K weave. JR sizing.",
    category: "FULL_STICK",
    priceCents: 4900,
    preorder: true,
  },

  // ---- YOUTH: Elite / Performance / Value ----
  {
    slug: "elite-youth-stick",
    name: "Elite Youth Stick",
    description: "215g full carbon, 24K weave. YTH sizing.",
    category: "FULL_STICK",
    priceCents: 7900,
    preorder: true,
  },
  {
    slug: "performance-youth-stick",
    name: "Performance Youth Stick",
    description: "245g full carbon, 18K weave. YTH sizing.",
    category: "FULL_STICK",
    priceCents: 5900,
    preorder: true,
  },
  {
    slug: "value-youth-stick",
    name: "Value Youth Stick",
    description: "275g full carbon, 18K weave. YTH sizing.",
    category: "FULL_STICK",
    priceCents: 3900,
    preorder: true,
  },

  // ---- GOALIE: Elite / Performance / Value ----
  {
    slug: "elite-goalie-stick",
    name: "Elite Goalie Stick",
    description: "450g full carbon paddle, 24K weave, 24\"-30\" paddle.",
    category: "GOALIE",
    priceCents: 14900,
    preorder: true,
  },
  {
    slug: "performance-goalie-stick",
    name: "Performance Goalie Stick",
    description: "480g full carbon paddle, 18K weave, 24\"-30\" paddle.",
    category: "GOALIE",
    priceCents: 12900,
    preorder: true,
  },
  {
    slug: "value-goalie-stick",
    name: "Value Goalie Stick",
    description: "520g full carbon paddle, 18K weave, 24\"-30\" paddle.",
    category: "GOALIE",
    priceCents: 10900,
    preorder: true,
  },

  // ---- IN STOCK: fixed builds, ships now, no batch wait ----
  {
    slug: "instock-senior-85-p92",
    name: "In-Stock Senior — 85 Flex / P92",
    description: "350g, 18K weave, 85 flex, P92 curve, right hand. On the shelf now.",
    category: "FULL_STICK",
    priceCents: 9900,
    inStock: 12,
    preorder: false,
  },
  {
    slug: "instock-senior-75-p28",
    name: "In-Stock Senior — 75 Flex / P28",
    description: "350g, 18K weave, 75 flex, P28 curve, right hand. On the shelf now.",
    category: "FULL_STICK",
    priceCents: 9900,
    inStock: 12,
    preorder: false,
  },
  {
    slug: "instock-junior-50-p92",
    name: "In-Stock Junior — 50 Flex / P92",
    description: "315g, 18K weave, 50 flex, P92 curve, right hand. On the shelf now.",
    category: "FULL_STICK",
    priceCents: 6900,
    inStock: 15,
    preorder: false,
  },
  {
    slug: "instock-goalie-26-paddle",
    name: 'In-Stock Goalie — 26" Paddle',
    description: '480g, 18K weave, 26" paddle, right hand. On the shelf now.',
    category: "GOALIE",
    priceCents: 12900,
    inStock: 6,
    preorder: false,
  },

  // ---- MINI STICKS ----
  {
    slug: "club-custom-mini-stick",
    name: "Club Custom Mini Stick",
    description: "Club colors + logo on an 18\" mini stick.",
    category: "MINI_CLUB",
    priceCents: 2799,
    preorder: true,
  },
  {
    slug: "fun-series-mini-stick",
    name: "Fun Series Mini Stick",
    description: "Wild graphics, loud colors.",
    category: "MINI_FUN",
    priceCents: 2799,
    preorder: true,
  },
];

// Locked builds for the IN_STOCK catalog (display only, no customization).
const FIXED_BUILD = {
  "instock-senior-85-p92": { fixedFlex: 85, fixedCurve: "P92", fixedHand: "Right", fixedLength: '60"' },
  "instock-senior-75-p28": { fixedFlex: 75, fixedCurve: "P28", fixedHand: "Right", fixedLength: '60"' },
  "instock-junior-50-p92": { fixedFlex: 50, fixedCurve: "P92", fixedHand: "Right", fixedLength: '54"' },
  "instock-goalie-26-paddle": { fixedHand: "Right" },
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

// Flex — per sizing tier
pushOpt("FLEX", [65, 70, 75, 80, 85, 90, 95, 102], { sizing: "SENIOR", defaultValue: 85 });
pushOpt("FLEX", [45, 50, 55, 60, 65], { sizing: "INT", defaultValue: 55 });
pushOpt("FLEX", [35, 40, 45, 50, 55], { sizing: "JR", defaultValue: 45 });
pushOpt("FLEX", [20, 25, 30, 35], { sizing: "YTH", defaultValue: 30 });

// Curve — full sticks vs youth/junior subset
pushOpt("CURVE", ["P92", "P28", "P88", "P92M", "PM9", "P02", "P90TM", "P91A"], {
  category: "FULL_STICK",
  defaultValue: "P92",
});
// Goalie paddle "curve"
pushOpt("CURVE", ["31-L"], { category: "GOALIE", defaultValue: "31-L" });

// Hand
pushOpt("HAND", ["Right", "Left"], { defaultValue: "Right" });

// Color — first (Black) is standard/no upcharge; others +$10
["Black", "Red", "Golden", "Transparent Blue", "Navy Blue", "Green", "Brown", "Purple", "Silver"].forEach(
  (c, i) =>
    optionValues.push({
      kind: "COLOR",
      value: c,
      sizing: "ALL",
      category: "ALL",
      upchargeCents: i === 0 ? 0 : 1000,
      isDefault: i === 0,
      sortOrder: i,
    })
);

// Length — 3 per tier (Senior / Int / Jr). Placeholder inches; edit in /admin.
pushOpt("LENGTH", ['60"', '57"', '54"'], { sizing: "SENIOR", defaultValue: '60"' });
pushOpt("LENGTH", ['57"', '54"', '51"'], { sizing: "INT", defaultValue: '57"' });
pushOpt("LENGTH", ['54"', '50"', '46"'], { sizing: "JR", defaultValue: '54"' });

// Paddle size — goalie only
pushOpt("PADDLE", ['24"', '26"', '28"', '30"'], { category: "GOALIE", defaultValue: '26"' });

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
