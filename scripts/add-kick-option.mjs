// One-off: add "Kick Point" as a selectable option, scoped per tier from the
// supplier's bending-point spec. Run once against the DB in your .env:
//   node scripts/add-kick-option.mjs
//   Senior / Intermediate / Goalie -> Low, Mid   (default Mid)
//   Junior / Youth                 -> Mid, High  (default Mid)
// Also strips the now-redundant "kick" tokens from product specs (it's a
// chosen option now, not a fixed spec).
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// 1) Attribute kind
await prisma.attributeKind.upsert({
  where: { key: "KICK" },
  update: { label: "Kick Point", unit: "", sortOrder: 5, active: true },
  create: { key: "KICK", label: "Kick Point", unit: "", sortOrder: 5 },
});

// 2) Option values, scoped by tier + category
const groups = [
  { sizing: "SENIOR", category: "FULL_STICK", values: ["Low", "Mid"] },
  { sizing: "INT", category: "FULL_STICK", values: ["Low", "Mid"] },
  { sizing: "JR", category: "FULL_STICK", values: ["Mid", "High"] },
  { sizing: "YTH", category: "FULL_STICK", values: ["Mid", "High"] },
  { sizing: "ALL", category: "GOALIE", values: ["Low", "Mid"] },
];
for (const g of groups) {
  for (let i = 0; i < g.values.length; i++) {
    const value = g.values[i];
    await prisma.optionValue.upsert({
      where: {
        kind_value_sizing_category: { kind: "KICK", value, sizing: g.sizing, category: g.category },
      },
      update: { active: true, isDefault: value === "Mid", sortOrder: i, upchargeCents: 0 },
      create: {
        kind: "KICK",
        value,
        sizing: g.sizing,
        category: g.category,
        isDefault: value === "Mid",
        sortOrder: i,
      },
    });
  }
}

// 3) Strip "kick" tokens from product specs (now a chosen option)
const prods = await prisma.product.findMany({ where: { specs: { isEmpty: false } }, select: { id: true, specs: true } });
let cleaned = 0;
for (const p of prods) {
  const next = (p.specs ?? []).filter((s) => !/kick/i.test(s));
  if (next.length !== p.specs.length) {
    await prisma.product.update({ where: { id: p.id }, data: { specs: next } });
    cleaned++;
  }
}

const kicks = await prisma.optionValue.findMany({
  where: { kind: "KICK", active: true },
  orderBy: [{ sizing: "asc" }, { sortOrder: "asc" }],
  select: { value: true, sizing: true, category: true, isDefault: true },
});
console.log("KICK option added. Scopes:");
for (const k of kicks) console.log(`  ${k.sizing}/${k.category}: ${k.value}${k.isDefault ? " (default)" : ""}`);
console.log(`Stripped kick tokens from ${cleaned} product spec list(s).`);

await prisma.$disconnect();
