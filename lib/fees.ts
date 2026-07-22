import { prisma } from "./db";

// Payment-processing (Clover) fee handling.
//
// Clover's REST API exposes customer-facing charges (surcharges, convenience
// fees) but NOT the merchant processing fee it deducts from you — that lives on
// the monthly Merchant Processing Statement. So we accrue an estimate per paid
// order from an admin-set rate, then reconcile monthly against the real
// statement total. Both land in the ledger as FEES expenses.

export const FEE_PERCENT_KEY = "clover_fee_percent"; // e.g. "2.6" = 2.6%
export const FEE_FIXED_KEY = "clover_fee_fixed_cents"; // e.g. "10" = $0.10

// Sensible defaults until the owner sets their real rate in /admin → Money.
export const DEFAULT_FEE_PERCENT = 2.6;
export const DEFAULT_FEE_FIXED_CENTS = 10;

export type FeeSettings = { percent: number; fixedCents: number };

export async function getFeeSettings(): Promise<FeeSettings> {
  try {
    const rows = (await prisma.setting.findMany({
      where: { key: { in: [FEE_PERCENT_KEY, FEE_FIXED_KEY] } },
    })) as { key: string; value: string }[];
    const map = new Map(rows.map((r) => [r.key, r.value]));
    const percent = Number(map.get(FEE_PERCENT_KEY));
    const fixed = Number(map.get(FEE_FIXED_KEY));
    return {
      percent: Number.isFinite(percent) && percent >= 0 ? percent : DEFAULT_FEE_PERCENT,
      fixedCents: Number.isFinite(fixed) && fixed >= 0 ? Math.floor(fixed) : DEFAULT_FEE_FIXED_CENTS,
    };
  } catch (e) {
    console.error("getFeeSettings error — using defaults", e);
    return { percent: DEFAULT_FEE_PERCENT, fixedCents: DEFAULT_FEE_FIXED_CENTS };
  }
}

export function computeFeeCents(amountCents: number, s: FeeSettings): number {
  if (amountCents <= 0) return 0;
  return Math.round((amountCents * s.percent) / 100) + s.fixedCents;
}

// Accrue the processing fee for a newly-paid order. Idempotent via the unique
// Expense.orderId — a repeated webhook is a no-op. Never throws: a books
// hiccup must not break payment processing.
export async function accrueOrderFee(orderId: string): Promise<void> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, subtotalCents: true, batchId: true, createdAt: true },
    });
    if (!order) return;
    const settings = await getFeeSettings();
    const amountCents = computeFeeCents(order.subtotalCents, settings);
    if (amountCents <= 0) return;
    await prisma.expense.upsert({
      where: { orderId: order.id },
      create: {
        date: order.createdAt,
        category: "FEES",
        description: `Clover processing fee (est. ${settings.percent}% + ${settings.fixedCents}¢) — order ${order.id.slice(0, 8)}`,
        amountCents,
        batchId: order.batchId,
        orderId: order.id,
      },
      update: {}, // already accrued — leave it alone
    });
  } catch (e) {
    console.error("accrueOrderFee failed (non-fatal)", orderId, e);
  }
}
