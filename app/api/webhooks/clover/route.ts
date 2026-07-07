import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { decrementForOrder } from "@/lib/inventory";

// Clover webhook receiver.
// Configure in Clover dashboard -> webhooks, point at
// https://stlhockeysticks.com/api/webhooks/clover
// Clover sends a verification code on first setup — check logs for it.
export async function POST(req: Request) {
  const payload = await req.json().catch(() => null);
  console.log("clover webhook", JSON.stringify(payload));

  // First-time verification handshake
  if (payload?.verificationCode) {
    console.log("CLOVER VERIFICATION CODE:", payload.verificationCode);
    return NextResponse.json({ ok: true });
  }

  // Payment events: mark matching order paid.
  // Clover hosted checkout events carry the checkoutSessionId in merchants[].objectId
  try {
    const merchants = payload?.merchants ?? {};
    for (const events of Object.values(merchants) as any[]) {
      for (const ev of events as any[]) {
        const objectId: string | undefined = ev?.objectId;
        if (!objectId) continue;
        const id = objectId.includes(":") ? objectId.split(":")[1] : objectId;
        // Find the still-unpaid order first so we only decrement stock
        // on the PENDING_PAYMENT -> PAID transition (idempotent: a repeat
        // webhook finds nothing pending and skips the decrement).
        const pending = await prisma.order.findFirst({
          where: { cloverCheckoutId: id, status: "PENDING_PAYMENT" },
          select: { id: true, couponId: true },
        });
        if (!pending) continue;
        await prisma.order.update({
          where: { id: pending.id },
          data: { status: "PAID" },
        });
        try {
          await decrementForOrder(pending.id);
        } catch (e) {
          console.error("stock decrement error", pending.id, e);
        }
        // Count the coupon redemption now that payment is confirmed.
        if (pending.couponId) {
          try {
            await prisma.coupon.update({
              where: { id: pending.couponId },
              data: { timesRedeemed: { increment: 1 } },
            });
          } catch (e) {
            console.error("coupon redeem increment error", pending.couponId, e);
          }
        }
      }
    }
  } catch (e) {
    console.error("webhook processing error", e);
  }

  return NextResponse.json({ ok: true });
}
