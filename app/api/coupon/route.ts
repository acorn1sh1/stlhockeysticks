import { NextResponse } from "next/server";
import { validateCoupon } from "@/lib/coupons";

// Cart-side preview: given a code + current subtotal, return the discount.
// Checkout re-validates independently, so this is purely for UX.
export async function POST(req: Request) {
  const { code, subtotalCents } = (await req.json().catch(() => ({}))) as {
    code?: string;
    subtotalCents?: number;
  };
  const subtotal = Math.max(0, Math.floor(Number(subtotalCents)));
  if (!code || !Number.isFinite(subtotal)) {
    return NextResponse.json({ error: "Missing code or subtotal." }, { status: 400 });
  }
  const result = await validateCoupon(code, subtotal);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({
    ok: true,
    code: result.code,
    discountCents: result.discountCents,
  });
}
