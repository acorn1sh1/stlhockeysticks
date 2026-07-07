import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/admin";

const VALID = ["OPEN", "ORDERED", "ARRIVED", "CLOSED"] as const;
type BatchStatus = (typeof VALID)[number];

// Advance a batch's status. Marking a batch ARRIVED also flips its paid
// orders to READY_FOR_PICKUP so pickup notices can go out.
export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { batchId, status } = (await req.json().catch(() => ({}))) as {
    batchId?: string;
    status?: BatchStatus;
  };
  if (!batchId || !status || !VALID.includes(status)) {
    return NextResponse.json({ error: "Invalid batch or status" }, { status: 400 });
  }
  try {
    await prisma.batch.update({ where: { id: batchId }, data: { status } });
    if (status === "ARRIVED") {
      await prisma.order.updateMany({
        where: { batchId, status: "PAID" },
        data: { status: "READY_FOR_PICKUP" },
      });
    }
  } catch (e) {
    console.error("admin batch update error", e);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
