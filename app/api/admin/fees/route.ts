import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/admin";
import {
  FEE_PERCENT_KEY,
  FEE_FIXED_KEY,
  getFeeSettings,
  computeFeeCents,
} from "@/lib/fees";

export const dynamic = "force-dynamic";

// Clover fee admin:
//  - action "settings"  → save the estimated fee rate (percent + fixed cents)
//  - action "backfill"  → accrue fees for paid orders that never got one
//  - action "reconcile" → post the difference between accrued estimates and
//                         the real monthly statement total as an adjustment
export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const b = (await req.json().catch(() => ({}))) as {
    action?: string;
    percent?: number;
    fixedCents?: number;
    month?: string; // "YYYY-MM"
    actualCents?: number;
  };

  try {
    if (b.action === "settings") {
      const percent = Number(b.percent);
      const fixedCents = Math.floor(Number(b.fixedCents));
      if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
        return NextResponse.json({ error: "Percent must be 0–100" }, { status: 400 });
      }
      if (!Number.isFinite(fixedCents) || fixedCents < 0) {
        return NextResponse.json({ error: "Fixed fee must be 0 or more" }, { status: 400 });
      }
      for (const [key, value] of [
        [FEE_PERCENT_KEY, String(percent)],
        [FEE_FIXED_KEY, String(fixedCents)],
      ] as const) {
        await prisma.setting.upsert({ where: { key }, create: { key, value }, update: { value } });
      }
      return NextResponse.json({ ok: true });
    }

    if (b.action === "backfill") {
      // Paid orders with no accrued fee yet (e.g. orders placed before this
      // feature, or a webhook that fired before it shipped).
      const settings = await getFeeSettings();
      const existing = (await prisma.expense.findMany({
        where: { orderId: { not: null } },
        select: { orderId: true },
      })) as { orderId: string | null }[];
      const done = new Set(existing.map((e) => e.orderId));
      const orders = await prisma.order.findMany({
        where: { status: { in: ["PAID", "READY_FOR_PICKUP", "PICKED_UP"] } },
        select: { id: true, subtotalCents: true, batchId: true, createdAt: true },
      });
      let created = 0;
      for (const o of orders) {
        if (done.has(o.id)) continue;
        const amountCents = computeFeeCents(o.subtotalCents, settings);
        if (amountCents <= 0) continue;
        await prisma.expense.create({
          data: {
            date: o.createdAt,
            category: "FEES",
            description: `Clover processing fee (est. ${settings.percent}% + ${settings.fixedCents}¢) — order ${o.id.slice(0, 8)}`,
            amountCents,
            batchId: o.batchId,
            orderId: o.id,
          },
        });
        created++;
      }
      return NextResponse.json({ ok: true, created });
    }

    if (b.action === "reconcile") {
      const month = typeof b.month === "string" ? b.month.trim() : "";
      if (!/^\d{4}-\d{2}$/.test(month)) {
        return NextResponse.json({ error: "Month must be YYYY-MM" }, { status: 400 });
      }
      const actualCents = Math.round(Number(b.actualCents));
      if (!Number.isFinite(actualCents) || actualCents < 0) {
        return NextResponse.json({ error: "Enter the statement total" }, { status: 400 });
      }
      const [y, m] = month.split("-").map(Number);
      const start = new Date(Date.UTC(y, m - 1, 1));
      const end = new Date(Date.UTC(y, m, 1));
      const key = `clover-fee-${month}`;

      // Everything already booked as FEES for the month, minus any prior
      // adjustment for this same month (so re-running is idempotent).
      const feeRows = (await prisma.expense.findMany({
        where: { category: "FEES", date: { gte: start, lt: end } },
        select: { amountCents: true, reconcileKey: true },
      })) as { amountCents: number; reconcileKey: string | null }[];
      const accruedCents = feeRows
        .filter((e) => e.reconcileKey !== key)
        .reduce((n, e) => n + e.amountCents, 0);
      const diffCents = actualCents - accruedCents;

      if (diffCents === 0) {
        await prisma.expense.deleteMany({ where: { reconcileKey: key } });
        return NextResponse.json({ ok: true, accruedCents, actualCents, diffCents: 0 });
      }
      await prisma.expense.upsert({
        where: { reconcileKey: key },
        create: {
          date: new Date(Date.UTC(y, m, 0)), // last day of the month
          category: "FEES",
          description: `Clover statement reconciliation — ${month}`,
          amountCents: diffCents,
          reconcileKey: key,
        },
        update: { amountCents: diffCents },
      });
      return NextResponse.json({ ok: true, accruedCents, actualCents, diffCents });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    console.error("admin fees error", e);
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }
}
