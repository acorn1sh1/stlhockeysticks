// Static catalog + option config. Source of truth for valid options;
// server re-prices and re-validates at checkout. Mirrors prisma/seed.mjs.

export type StickOptions = {
  flex: number[];
  curve: string[];
  hand: string[];
  colors: string[]; // first = standard (no upcharge)
  colorUpchargeCents: number;
  nameUpchargeCents: number; // custom name printing on shaft
};

export type CatalogItem = {
  slug: string;
  name: string;
  description: string;
  category: "FULL_STICK" | "GOALIE" | "MINI_CLUB" | "MINI_FUN";
  priceCents: number;
  badge?: string;
  specs?: string[];
  options?: StickOptions;
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

const baseOpts = {
  colors: COLORS,
  colorUpchargeCents: 1000,
  nameUpchargeCents: 1000,
  hand: HANDS,
};

export const CATALOG: CatalogItem[] = [
  {
    slug: "elite-senior-stick",
    name: "Elite Senior Stick",
    description:
      "Our lightest build — 315g of T1100 carbon with boron fiber and 24K weave. The stick that keeps up with your hands.",
    category: "FULL_STICK",
    priceCents: 11900,
    badge: "Top Shelf",
    specs: ["315g", "T1100 + boron carbon", "24K weave", "High/Mid/Low kick"],
    options: {
      ...baseOpts,
      flex: [65, 70, 75, 80, 85, 90, 95, 102],
      curve: CURVES_FULL,
    },
  },
  {
    slug: "performance-senior-stick",
    name: "Performance Senior Stick",
    description:
      "350g full-carbon workhorse with 18K weave. Pro-shop feel at a beer-league price. Our most popular stick.",
    category: "FULL_STICK",
    priceCents: 9900,
    badge: "Best Seller",
    specs: ["350g", "T1100/T800 carbon", "18K weave", "Mid kick"],
    options: {
      ...baseOpts,
      flex: [65, 70, 75, 80, 85, 90, 95, 102],
      curve: CURVES_FULL,
    },
  },
  {
    slug: "value-senior-stick",
    name: "Value Senior Stick",
    description:
      "425g full-carbon build. A little more heft, a lot less money. Perfect backup or first composite.",
    category: "FULL_STICK",
    priceCents: 7900,
    badge: "Best Value",
    specs: ["425g", "T700 carbon", "18K weave", "Mid kick"],
    options: {
      ...baseOpts,
      flex: [65, 70, 75, 80, 85, 90, 95, 102],
      curve: CURVES_FULL,
    },
  },
  {
    slug: "intermediate-stick",
    name: "Intermediate Stick",
    description:
      "315g full-carbon INT build for players stepping up. Same construction as our senior Elite, sized down.",
    category: "FULL_STICK",
    priceCents: 8900,
    specs: ["315g", "Full carbon", "24K weave", "INT sizing"],
    options: {
      ...baseOpts,
      flex: [45, 50, 55, 60, 65],
      curve: CURVES_FULL,
    },
  },
  {
    slug: "junior-stick",
    name: "Junior Stick",
    description:
      "295g full-carbon JR stick. Light enough for developing shots, tough enough for driveway abuse.",
    category: "FULL_STICK",
    priceCents: 6900,
    specs: ["295g", "Full carbon", "24K weave", "JR sizing"],
    options: {
      ...baseOpts,
      flex: [35, 40, 45, 50, 55],
      curve: CURVES_YOUTH,
    },
  },
  {
    slug: "youth-stick",
    name: "Youth Stick",
    description:
      "Feather-light full-carbon youth stick. Real construction, kid-sized flex — not a toy-store special.",
    category: "FULL_STICK",
    priceCents: 5900,
    specs: ["215–275g", "Full carbon", "24K weave", "YTH sizing"],
    options: {
      ...baseOpts,
      flex: [20, 25, 30, 35],
      curve: CURVES_YOUTH,
    },
  },
  {
    slug: "goalie-stick",
    name: "Goalie Stick",
    description:
      "Full-carbon goal stick, 31-L paddle. Because goalies deserve wholesale prices too.",
    category: "GOALIE",
    priceCents: 12900,
    specs: ["Full carbon", "31-L paddle", "18K weave"],
    options: {
      ...baseOpts,
      flex: [65, 70, 75, 80, 85, 90, 95, 102],
      curve: ["31-L"],
    },
  },
  {
    slug: "club-custom-mini-stick",
    name: "Club Custom Mini Stick",
    description:
      "Your club's colors and logo on an 18\" knee-hockey legend. Rally your team.",
    category: "MINI_CLUB",
    priceCents: 1999,
    badge: "Club Favorite",
  },
  {
    slug: "fun-series-mini-stick",
    name: "Fun Series Mini Stick",
    description:
      "Wild graphics, loud colors. The basement-hockey classic kids fight over.",
    category: "MINI_FUN",
    priceCents: 1499,
  },
];

export const fmtPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export type SelectedOptions = {
  flex?: string;
  curve?: string;
  hand?: string;
  color?: string;
  customName?: string;
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
  if (!item.options) return null; // minis: no options
  if (!sel) return "Missing options";
  const o = item.options;
  if (!sel.flex || !o.flex.includes(Number(sel.flex))) return "Invalid flex";
  if (!sel.curve || !o.curve.includes(sel.curve)) return "Invalid curve";
  if (!sel.hand || !o.hand.includes(sel.hand)) return "Invalid hand";
  if (sel.color && !o.colors.includes(sel.color)) return "Invalid color";
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
    sel.color && sel.color !== "Black" ? sel.color : null,
    sel.customName?.trim() ? `"${sel.customName.trim()}"` : null,
  ].filter(Boolean);
  return parts.join(" · ");
}

// Monthly batch logic (display only — real batches live in DB)
export function nextBatch() {
  const now = new Date();
  const cutoff = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const pickupStart = new Date(now.getFullYear(), now.getMonth() + 1, 14);
  const daysLeft = Math.max(
    0,
    Math.ceil((cutoff.getTime() - now.getTime()) / 86400000)
  );
  return { cutoff, pickupStart, daysLeft };
}
