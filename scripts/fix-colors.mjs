// One-off: color catalog cleanup. Run once against the DB in your .env:
//   node scripts/fix-colors.mjs
// Does everything color-related (idempotent, supersedes zero-color-upcharge.mjs):
//   - removes "Silver"
//   - adds "Pink" (free)
//   - sets every color's upcharge to 0
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const removed = await prisma.optionValue.deleteMany({ where: { kind: "COLOR", value: "Silver" } });

await prisma.optionValue.upsert({
  where: {
    kind_value_sizing_category: { kind: "COLOR", value: "Pink", sizing: "ALL", category: "ALL" },
  },
  update: { active: true, upchargeCents: 0 },
  create: { kind: "COLOR", value: "Pink", sizing: "ALL", category: "ALL", upchargeCents: 0, sortOrder: 8 },
});

const zeroed = await prisma.optionValue.updateMany({ where: { kind: "COLOR" }, data: { upchargeCents: 0 } });

const colors = await prisma.optionValue.findMany({
  where: { kind: "COLOR", active: true },
  orderBy: { sortOrder: "asc" },
  select: { value: true },
});
console.log(`Removed ${removed.count} Silver, ensured Pink, zeroed ${zeroed.count} color upcharge(s).`);
console.log("Colors now:", colors.map((c) => c.value).join(", "));

await prisma.$disconnect();
