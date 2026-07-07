import { NextResponse } from "next/server";
import { validateCoupon } from "@/lib/coupons";
import { clientKey, consumeRateLimit } from "@/lib/rateLimit";

// Cart-side preview: given a code + current subtotal, return the discount.
// Checkout re-validates independently, so this is purely for UX.
export async function POST(req: Request) {
  // Coupon codes are short, guessable strings — throttle so this preview
  // endpoint can't be used to brute-force valid codes.
  if (!consumeRateLimit(`coupon:${clientKey(req)}`, { windowMs: 5 * 60 * 1000, max: 20 })) {
    return NextResponse.json({ error: "Too many attempts. Try again shortly." }, { status: 429 });
  }

  const { code, subtotalCents, quantity } = (await req.json().catch(() => ({}))) as {
    code?: string;
    subtotalCents?: number;
    quantity?: number;
  };
  const subtotal = Math.max(0, Math.floor(Number(subtotalCents)));
  if (!code || !Number.isFinite(subtotal)) {
    return NextResponse.json({ error: "Missing code or subtotal." }, { status: 400 });
  }
  const qty = Number.isFinite(Number(quantity)) && Number(quantity) > 0 ? Math.floor(Number(quantity)) : 1;
  const result = await validateCoupon(code, subtotal, qty);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({
    ok: true,
    code: result.code,
    discountCents: result.discountCents,
  });
}
