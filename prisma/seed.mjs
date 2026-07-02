import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// Retail prices ~40% margin over manufacturer quote (landed cost incl. freight share).
const products = [
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
  {
    slug: "intermediate-stick",
    name: "Intermediate Stick",
    description: "315g full carbon INT build.",
    category: "FULL_STICK",
    priceCents: 8900,
    preorder: true,
  },
  {
    slug: "junior-stick",
    name: "Junior Stick",
    description: "295g full carbon JR build.",
    category: "FULL_STICK",
    priceCents: 6900,
    preorder: true,
  },
  {
    slug: "youth-stick",
    name: "Youth Stick",
    description: "215–275g full carbon YTH build.",
    category: "FULL_STICK",
    priceCents: 5900,
    preorder: true,
  },
  {
    slug: "goalie-stick",
    name: "Goalie Stick",
    description: "Full carbon goal stick, 31-L paddle.",
    category: "GOALIE",
    priceCents: 12900,
    preorder: true,
  },
  {
    slug: "club-custom-mini-stick",
    name: "Club Custom Mini Stick",
    description: "Club colors + logo on an 18\" mini stick.",
    category: "MINI_CLUB",
    priceCents: 1999,
    preorder: true,
  },
  {
    slug: "fun-series-mini-stick",
    name: "Fun Series Mini Stick",
    description: "Wild graphics, loud colors.",
    category: "MINI_FUN",
    priceCents: 1499,
    preorder: true,
  },
];

for (const p of products) {
  await prisma.product.upsert({
    where: { slug: p.slug },
    update: p,
    create: p,
  });
}

// Retire any old slugs no longer sold
await prisma.product.updateMany({
  where: { slug: { notIn: products.map((p) => p.slug) } },
  data: { active: false },
});

// Open batch: cutoff = 1st of next month, pickup mid following month
const now = new Date();
const cutoff = new Date(now.getFullYear(), now.getMonth() + 1, 1);
const pickupStart = new Date(now.getFullYear(), now.getMonth() + 1, 14);
const pickupEnd = new Date(now.getFullYear(), now.getMonth() + 1, 21);
const name = `${cutoff.toLocaleString("en-US", { month: "long", year: "numeric" })} Batch`;

const existing = await prisma.batch.findFirst({ where: { status: "OPEN" } });
if (!existing) {
  await prisma.batch.create({
    data: { name, cutoffDate: cutoff, pickupStart, pickupEnd },
  });
}

console.log("Seeded products + open batch.");
await prisma.$disconnect();
