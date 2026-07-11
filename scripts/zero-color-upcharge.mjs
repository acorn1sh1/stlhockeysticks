// One-off: remove the upcharge from every stick COLOR option value.
// Run once against the DB in your .env:  node scripts/zero-color-upcharge.mjs
// Safe + idempotent — only touches OptionValue rows where kind = "COLOR".
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const before = await prisma.optionValue.findMany({
  where: { kind: "COLOR", upchargeCents: { gt: 0 } },
  select: { value: true, sizing: true, upchargeCents: true },
});

const res = await prisma.optionValue.updateMany({
  where: { kind: "COLOR" },
  data: { upchargeCents: 0 },
});

console.log(`Zeroed color upcharge on ${res.count} COLOR value(s).`);
if (before.length) {
  console.log("Previously charged:", before.map((r) => `${r.value}(${r.sizing}) $${(r.upchargeCents / 100).toFixed(2)}`).join(", "));
}

await prisma.$disconnect();
