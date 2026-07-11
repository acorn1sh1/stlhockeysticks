// One-off: correct flex / length / curve option values to match the official
// size table. Run once against the DB in your .env:
//   node scripts/fix-sizes.mjs
//
// What it does (see prisma/seed.mjs for the canonical version):
//  FLEX
//   - Senior full-stick flex -> 65,75,85,95,102,110,112  (scoped FULL_STICK)
//   - Goalie flex -> 65,70,75,80,85,90,95,102  (scoped GOALIE, so it no longer
//     borrows Senior's list)
//   - Int / Jr / Youth unchanged
//  LENGTH  (were placeholders)
//   - Senior 66,68,70 | Int 63,61,59 | Jr 57,55,53 | Youth 51,49,47 (new)
//  CURVE  (now tier-scoped)
//   - Senior + Int -> P92,P28,P88,P92M,PM9,P02,P90TM,P91A
//   - Junior + Youth -> P92,P28
//   - Goalie P31 untouched
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const upsert = (row) =>
  prisma.optionValue.upsert({
    where: {
      kind_value_sizing_category: {
        kind: row.kind,
        value: row.value,
        sizing: row.sizing,
        category: row.category,
      },
    },
    update: { upchargeCents: 0, isDefault: !!row.isDefault, sortOrder: row.sortOrder, active: true },
    create: { ...row, upchargeCents: 0, active: true },
  });

async function setGroup(rows) {
  for (const r of rows) await upsert(r);
}
const mk = (kind, values, sizing, category, def) =>
  values.map((v, i) => ({
    kind,
    value: String(v),
    sizing,
    category,
    isDefault: String(def) === String(v),
    sortOrder: i,
  }));

// ---- FLEX ----
// Remove the old Senior flex rows (they were category=ALL and doubled as the
// goalie list), then re-add Senior scoped to FULL_STICK + a dedicated Goalie set.
await prisma.optionValue.deleteMany({ where: { kind: "FLEX", sizing: "SENIOR" } });
await prisma.optionValue.deleteMany({ where: { kind: "FLEX", category: "GOALIE" } });
await setGroup(mk("FLEX", [65, 75, 85, 95, 102, 110, 112], "SENIOR", "FULL_STICK", 85));
await setGroup(mk("FLEX", [65, 70, 75, 80, 85, 90, 95, 102], "ALL", "GOALIE", 85));

// ---- LENGTH ----
await prisma.optionValue.deleteMany({ where: { kind: "LENGTH" } });
await setGroup(mk("LENGTH", ['66"', '68"', '70"'], "SENIOR", "ALL", '68"'));
await setGroup(mk("LENGTH", ['63"', '61"', '59"'], "INT", "ALL", '61"'));
await setGroup(mk("LENGTH", ['57"', '55"', '53"'], "JR", "ALL", '55"'));
await setGroup(mk("LENGTH", ['51"', '49"', '47"'], "YTH", "ALL", '49"'));

// ---- CURVE ---- (tier-scope the full-stick set)
await prisma.optionValue.deleteMany({ where: { kind: "CURVE", category: "FULL_STICK" } });
const FULL_CURVES = ["P92", "P28", "P88", "P92M", "PM9", "P02", "P90TM", "P91A"];
await setGroup(mk("CURVE", FULL_CURVES, "SENIOR", "FULL_STICK", "P92"));
await setGroup(mk("CURVE", FULL_CURVES, "INT", "FULL_STICK", "P92"));
await setGroup(mk("CURVE", ["P92", "P28"], "JR", "FULL_STICK", "P92"));
await setGroup(mk("CURVE", ["P92", "P28"], "YTH", "FULL_STICK", "P92"));
// Goalie P31 (category GOALIE) is left as-is.

const summary = await prisma.optionValue.groupBy({
  by: ["kind", "sizing", "category"],
  where: { kind: { in: ["FLEX", "LENGTH", "CURVE"] }, active: true },
  _count: true,
});
console.log("Done. Active FLEX/LENGTH/CURVE scopes now:");
for (const s of summary.sort((a, b) => (a.kind + a.sizing).localeCompare(b.kind + b.sizing)))
  console.log(`  ${s.kind} ${s.sizing}/${s.category}: ${s._count} value(s)`);

await prisma.$disconnect();
