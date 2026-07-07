import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/admin";

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
      }
      return NextResponse.json({ ok: true });
    }

    // Edit an existing batch's details
    if (b.batchId) {
      const data: Record<string, unknown> = {};
      if (typeof b.name === "string" && b.name.trim()) data.name = b.name.trim().slice(0, 100);
      const cutoffDate = parseDate(b.cutoffDate);
      const pickupStart = parseDate(b.pickupStart);
      const pickupEnd = parseDate(b.pickupEnd);
      if (cutoffDate) data.cutoffDate = cutoffDate;
      if (pickupStart) data.pickupStart = pickupStart;
      if (pickupEnd) data.pickupEnd = pickupEnd;
      if (!Object.keys(data).length) {
        return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
      }
      await prisma.batch.update({ where: { id: b.batchId }, data });
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
