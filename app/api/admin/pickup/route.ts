import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { recordPickup, type PickupLineInput } from "@/lib/pickup";

// Record a physical handoff.
//   { orderId, pickedUpBy, note?, lines: [{ orderItemId, qty }] }
//
// qty may be negative to correct an over-recorded pickup. All validation
// (ownership, bounds, duplicates, concurrency) lives in lib/pickup.ts.
export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const orderId = typeof b.orderId === "string" ? b.orderId : "";
  const pickedUpBy = typeof b.pickedUpBy === "string" ? b.pickedUpBy : "";
  const note = typeof b.note === "string" ? b.note : null;
  const lines = Array.isArray(b.lines) ? (b.lines as PickupLineInput[]) : [];

  if (!orderId) return NextResponse.json({ error: "orderId required" }, { status: 400 });

  try {
    const res = await recordPickup(orderId, { pickedUpBy, note, lines });
    if (!res.ok) {
      return NextResponse.json({ error: res.error }, { status: res.status ?? 400 });
    }
    return NextResponse.json({
      ok: true,
      fullyPickedUp: res.fullyPickedUp,
      outstanding: res.outstanding,
    });
  } catch (e) {
    console.error("admin pickup error", e);
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }
}
