import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/admin";

// Admin order mutations. Currently: reassign an order to a different batch
// (or to none / "from stock"). Auto-assignment at checkout covers the normal
// path; this is manual override for stragglers or corrections.
//   { orderId, batchId: string | null }
export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const orderId = typeof b.orderId === "string" ? b.orderId : "";
  // Explicit null (or "") clears the batch; a string sets it.
  const batchId =
    b.batchId === null || b.batchId === "" ? null : typeof b.batchId === "string" ? b.batchId : undefined;

  if (!orderId || batchId === undefined) {
    return NextResponse.json({ error: "orderId + batchId required" }, { status: 400 });
  }

  try {
    if (batchId) {
      const batch = await prisma.batch.findUnique({ where: { id: batchId }, select: { id: true } });
      if (!batch) return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }
    await prisma.order.update({ where: { id: orderId }, data: { batchId } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("admin order error", e);
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }
}
