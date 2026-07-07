import { prisma } from "./db";
import { sendEmail } from "./email";

const LOW_STOCK_THRESHOLD = Number(process.env.LOW_STOCK_THRESHOLD ?? 3);

export type StockInfo = { inStock: number; active: boolean; preorder: boolean };

// Live on-hand counts keyed by product slug. DB is the source of truth.
// On DB error we return {} — callers then treat stocked items as
// out-of-stock (pre-order fallback), which is the safe direction:
// we never show "Ships Now" for something we can't confirm we have.
export async function getStockMap(): Promise<Record<string, StockInfo>> {
  try {
    const rows = await prisma.product.findMany({
      select: { slug: true, inStock: true, active: true, preorder: true },
    });
    return Object.fromEntries(
      rows.map((r) => [r.slug, { inStock: r.inStock, active: r.active, preorder: r.preorder }])
    );
  } catch (e) {
    console.error("getStockMap error", e);
    return {};
  }
}

// Decrement on-hand stock for a paid order's stocked line items.
// Only affects products that carry real inventory (preorder = false);
// built-to-order / pre-order products are untouched. Floored at 0.
// Runs in a transaction so a partial failure doesn't leave counts skewed.
export async function decrementForOrder(orderId: string): Promise<void> {
  const items = await prisma.orderItem.findMany({
    where: { orderId },
    include: {
      product: { select: { id: true, name: true, inStock: true, preorder: true } },
    },
  });

  const stocked = items.filter((it) => it.product && !it.product.preorder);
  const updates = [];
  const crossedLow: { name: string; left: number }[] = [];

  for (const it of stocked) {
    const before = it.product.inStock;
    const after = Math.max(0, before - it.quantity);
    updates.push(
      prisma.product.update({ where: { id: it.productId }, data: { inStock: after } })
    );
    // Alert only on the crossing into low territory (so we don't email on
    // every subsequent order once a SKU is already low).
    if (before > LOW_STOCK_THRESHOLD && after <= LOW_STOCK_THRESHOLD) {
      crossedLow.push({ name: it.product.name, left: after });
    }
  }

  if (updates.length) await prisma.$transaction(updates);

  if (crossedLow.length) {
    const rows = crossedLow
      .map((c) => `<li><strong>${c.name}</strong> — ${c.left} left</li>`)
      .join("");
    await sendEmail({
      subject: `Low stock: ${crossedLow.map((c) => c.name).join(", ")}`,
      html: `<h2>Low stock alert</h2><p>These ships-now SKUs dropped to ${LOW_STOCK_THRESHOLD} or fewer after a paid order:</p><ul>${rows}</ul><p>Restock them in <a href="${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/admin">/admin</a>.</p>`,
    }).catch((e) => console.error("low-stock email failed", e));
  }
}
