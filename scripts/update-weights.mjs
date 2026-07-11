// One-off: set product weights (description + specs) to the weights we actually
// sell, per the official price sheet. Run once against the DB in your .env:
//   node scripts/update-weights.mjs
// Youth and Goalie drop to 2 SKUs — the Value versions are deactivated (hidden,
// not deleted, so order history is preserved).
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// slug -> { g: new gram weight, desc: new description }
const updates = {
  // Senior
  "elite-senior-stick": { g: 335, desc: "335g T1100 carbon + boron, 24K weave. Our lightest build." },
  "performance-senior-stick": { g: 375, desc: "375g full carbon, 18K weave. The workhorse." },
  "value-senior-stick": { g: 425, desc: "425g full carbon, 18K weave. Budget-friendly backup." },
  // Intermediate
  "elite-intermediate-stick": { g: 295, desc: "295g T1100 + boron carbon, 24K weave. INT sizing." },
  "performance-intermediate-stick": { g: 335, desc: "335g full carbon, 18K weave. INT sizing." },
  "value-intermediate-stick": { g: 395, desc: "395g full carbon, 18K weave. INT sizing." },
  // Junior
  "elite-junior-stick": { g: 245, desc: "245g T1100 + boron carbon, 24K weave. JR sizing." },
  "performance-junior-stick": { g: 265, desc: "265g full carbon, 18K weave. JR sizing." },
  "value-junior-stick": { g: 315, desc: "315g full carbon, 18K weave. JR sizing." },
  // Youth (2 SKUs)
  "elite-youth-stick": { g: 225, desc: "225g T1100 + boron carbon, 24K weave. YTH sizing." },
  "performance-youth-stick": { g: 265, desc: "265g full carbon, 18K weave. YTH sizing." },
  // Goalie (2 SKUs)
  "elite-goalie-stick": { g: 600, desc: '600g full carbon paddle, 24K weave, 21"-28" paddle.' },
  "performance-goalie-stick": { g: 800, desc: '800g full carbon paddle, 18K weave, 21"-28" paddle.' },
};
const deactivate = ["value-youth-stick", "value-goalie-stick"];

for (const [slug, u] of Object.entries(updates)) {
  const p = await prisma.product.findUnique({ where: { slug } });
  if (!p) {
    console.log(`skip ${slug} (not found)`);
    continue;
  }
  // Replace the weight spec (e.g. "315g") wherever it appears; add if missing.
  let specs = (p.specs ?? []).map((s) => (/^\s*\d+\s*g\s*$/i.test(s) ? `${u.g}g` : s));
  if (!specs.includes(`${u.g}g`)) specs = [`${u.g}g`, ...specs];
  await prisma.product.update({ where: { slug }, data: { description: u.desc, specs } });
  console.log(`${slug} -> ${u.g}g`);
}

for (const slug of deactivate) {
  const r = await prisma.product.updateMany({ where: { slug }, data: { active: false } });
  console.log(`deactivated ${slug} (${r.count})`);
}

await prisma.$disconnect();
