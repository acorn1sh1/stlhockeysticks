import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

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
        await prisma.order.updateMany({
          where: { cloverCheckoutId: id, status: "PENDING_PAYMENT" },
          data: { status: "PAID" },
        });
      }
    }
  } catch (e) {
    console.error("webhook processing error", e);
  }

  return NextResponse.json({ ok: true });
}
