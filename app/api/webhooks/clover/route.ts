import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { decrementForOrder } from "@/lib/inventory";
import { verifyCloverSignature } from "@/lib/cloverWebhook";
import { pushPaidOrder } from "@/lib/cornishCore";
import { accrueOrderFee } from "@/lib/fees";

// Clover webhook receiver.
// Configure in Clover dashboard -> webhooks, point at
// https://stlhockeysticks.com/api/webhooks/clover
// Clover sends a verification code on first setup — check logs for it.
//
// Set CLOVER_WEBHOOK_SECRET to the Signing Secret shown on that same
// dashboard page (Ecommerce > Hosted Checkout > Webhook). Without it every
// request here is trusted blindly, which lets anyone forge a "paid" event.
export async function POST(req: Request) {
  const rawBody = await req.text();
  const payload = (() => {
    try {
      return JSON.parse(rawBody);
    } catch {
      return null;
    }
  })();

  const secret = process.env.CLOVER_WEBHOOK_SECRET;
  const sigHeader = req.headers.get("clover-signature");
  const signatureValid = !!secret && verifyCloverSignature(rawBody, sigHeader, secret);

  // First-time verification handshake: harmless (no state change), and
  // Clover may ping this before/while the signing secret is being set up,
  // so accept it even if unsigned — just don't trust it for anything else.
  if (payload?.verificationCode) {
    console.log("CLOVER VERIFICATION CODE:", payload.verificationCode);
    return NextResponse.json({ ok: true });
  }

  if (!secret) {
    console.error(
      "clover webhook rejected: CLOVER_WEBHOOK_SECRET not set — refusing to trust unsigned payment events"
    );
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }
  if (!signatureValid) {
    console.error("clover webhook rejected: invalid or missing Clover-Signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  console.log("clover webhook", JSON.stringify(payload));

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
        // Accrue the estimated Clover processing fee into the ledger so batch
        // margin/P&L reflect it immediately. Idempotent + never throws.
        await accrueOrderFee(pending.id);
        // Mirror the paid order up to cornish-core (the shared books).
        // Best-effort: pushPaidOrder swallows its own errors.
        await pushPaidOrder(pending.id);
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
