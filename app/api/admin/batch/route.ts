import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/admin";
import { sendBatchReadyEmails } from "@/lib/orderEmail";

const VALID = ["OPEN", "ORDERED", "ARRIVED", "CLOSED"] as const;
type BatchStatus = (typeof VALID)[number];

function parseDate(v: unknown): Date | null {
  if (typeof v !== "string" || !v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

// Batches are normally auto-created/advanced by checkout (see lib/batch.ts)
// as the monthly cutoff rolls over. This route lets admin override that:
//  - batchId + status            → advance status (ARRIVED also flips paid
//                                   orders to READY_FOR_PICKUP)
//  - batchId + name/dates, no status → edit an existing batch's details
//  - no batchId                  → create a new batch by hand
export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const b = (await req.json().catch(() => ({}))) as {
    batchId?: string;
    status?: BatchStatus;
    name?: string;
    cutoffDate?: string;
    pickupStart?: string;
    pickupEnd?: string;
    // Landed-cost fields (already dollars→cents converted client-side)
    freightCents?: number;
    tariffCents?: number;
    otherCostCents?: number;
    costNotes?: string;
    // Per-product unit-cost overrides for this batch's supplier order
    unitCosts?: { productId: string; unitCostCents: number }[];
    // Inventory restock lines for this batch's supplier order.
    // qty > 0 upserts the line; qty 0 removes it (unless already received).
    stockLines?: { productId: string; qty: number }[];
  };

  const cents = (v: unknown): number | null => {
    if (v == null) return null;
    const n = Math.max(0, Math.floor(Number(v)));
    return Number.isFinite(n) ? n : null;
  };

  try {
    // Advance status
    if (b.batchId && b.status) {
      if (!VALID.includes(b.status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      await prisma.batch.update({ where: { id: b.batchId }, data: { status: b.status } });
      if (b.status === "ARRIVED") {
        await prisma.order.updateMany({
          where: { batchId: b.batchId, status: "PAID" },
          data: { status: "READY_FOR_PICKUP" },
        });
        // Receive restock lines: bump on-hand inventory exactly once per
        // line (`received` guard — flipping the status back and forth
        // can't double-count).
        const lines = await prisma.batchStockLine.findMany({
          where: { batchId: b.batchId, received: false },
        });
        for (const line of lines) {
          await prisma.$transaction([
            prisma.product.update({
              where: { id: line.productId },
              data: { inStock: { increment: line.qty } },
            }),
            prisma.batchStockLine.update({
              where: { id: line.id },
              data: { received: true },
            }),
          ]);
        }
      }
      // Tell customers their sticks landed. Only orders that haven't already
      // been emailed for this batch get one, so flipping ARRIVED → ORDERED →
      // ARRIVED can't re-spam. Never blocks the status change.
      if (b.status === "ARRIVED") {
        try {
          const mail = await sendBatchReadyEmails(b.batchId);
          return NextResponse.json({ ok: true, mail });
        } catch (e) {
          console.error("batch ready emails failed", b.batchId, e);
        }
      }
      return NextResponse.json({ ok: true });
    }

    // Edit an existing batch's details / costs
    if (b.batchId) {
      const data: Record<string, unknown> = {};
      if (typeof b.name === "string" && b.name.trim()) data.name = b.name.trim().slice(0, 100);
      const cutoffDate = parseDate(b.cutoffDate);
      const pickupStart = parseDate(b.pickupStart);
      const pickupEnd = parseDate(b.pickupEnd);
      if (cutoffDate) data.cutoffDate = cutoffDate;
      if (pickupStart) data.pickupStart = pickupStart;
      if (pickupEnd) data.pickupEnd = pickupEnd;
      const freight = cents(b.freightCents);
      const tariff = cents(b.tariffCents);
      const other = cents(b.otherCostCents);
      if (freight != null) data.freightCents = freight;
      if (tariff != null) data.tariffCents = tariff;
      if (other != null) data.otherCostCents = other;
      if (typeof b.costNotes === "string") data.costNotes = b.costNotes.slice(0, 500) || null;

      const unitCosts = Array.isArray(b.unitCosts) ? b.unitCosts : null;
      const stockLines = Array.isArray(b.stockLines) ? b.stockLines : null;
      if (!Object.keys(data).length && !unitCosts && !stockLines) {
        return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
      }
      if (Object.keys(data).length) {
        await prisma.batch.update({ where: { id: b.batchId }, data });
      }
      if (unitCosts) {
        for (const uc of unitCosts) {
          const c = cents(uc?.unitCostCents);
          if (typeof uc?.productId !== "string" || !uc.productId || c == null) continue;
          await prisma.batchUnitCost.upsert({
            where: { batchId_productId: { batchId: b.batchId, productId: uc.productId } },
            create: { batchId: b.batchId, productId: uc.productId, unitCostCents: c },
            update: { unitCostCents: c },
          });
        }
      }
      if (stockLines) {
        for (const sl of stockLines) {
          if (typeof sl?.productId !== "string" || !sl.productId) continue;
          const qty = Math.floor(Number(sl.qty));
          if (!Number.isFinite(qty) || qty < 0) continue;
          const where = { batchId_productId: { batchId: b.batchId, productId: sl.productId } };
          if (qty === 0) {
            // Remove the line — but never a received one (its units are
            // already counted into inStock; deleting it would orphan the
            // audit trail). Adjust inventory in the Stock panel instead.
            await prisma.batchStockLine.deleteMany({
              where: { batchId: b.batchId, productId: sl.productId, received: false },
            });
            continue;
          }
          const existing = await prisma.batchStockLine.findUnique({ where });
          if (existing?.received) continue; // locked once received
          await prisma.batchStockLine.upsert({
            where,
            create: { batchId: b.batchId, productId: sl.productId, qty },
            update: { qty },
          });
        }
      }
      return NextResponse.json({ ok: true });
    }

    // Create a new batch by hand
    const name = typeof b.name === "string" ? b.name.trim().slice(0, 100) : "";
    const cutoffDate = parseDate(b.cutoffDate);
    const pickupStart = parseDate(b.pickupStart);
    const pickupEnd = parseDate(b.pickupEnd);
    if (!name || !cutoffDate || !pickupStart || !pickupEnd) {
      return NextResponse.json(
        { error: "name, cutoffDate, pickupStart, and pickupEnd are required" },
        { status: 400 }
      );
    }
    await prisma.batch.create({ data: { name, cutoffDate, pickupStart, pickupEnd } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("admin batch error", e);
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }
}

// Remove a batch. Blocked when orders reference it unless ?force=1 —
// force detaches those orders (batchId → null, order history intact)
// before deleting. Unit-cost overrides cascade-delete; ledger expenses
// keep their row but lose the batch link (SetNull).
export async function DELETE(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const batchId = url.searchParams.get("batchId");
  const force = url.searchParams.get("force") === "1";
  if (!batchId) return NextResponse.json({ error: "batchId required" }, { status: 400 });

  try {
    const orderCount = await prisma.order.count({ where: { batchId } });
    if (orderCount > 0 && !force) {
      return NextResponse.json(
        { error: `${orderCount} order(s) are in this batch. Delete anyway to detach them (orders are kept).`, orderCount },
        { status: 409 }
      );
    }
    if (orderCount > 0) {
      await prisma.order.updateMany({ where: { batchId }, data: { batchId: null } });
    }
    await prisma.batch.delete({ where: { id: batchId } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("admin batch delete error", e);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
