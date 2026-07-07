import { prisma } from "./db";
import { fmtPrice } from "./catalog";

export type CouponResult =
  | { ok: true; couponId: string; code: string; discountCents: number }
  | { ok: false; error: string };

// Validate a coupon against a given (pre-coupon) subtotal and return the
// discount it would apply. Used both for the cart preview and — re-run —
// server-side at checkout so a client can never fake a discount.
export async function validateCoupon(
  codeRaw: string,
  subtotalCents: number
): Promise<CouponResult> {
  const code = codeRaw.trim().toUpperCase();
  if (!code) return { ok: false, error: "Enter a code." };

  let c;
  try {
    c = await prisma.coupon.findUnique({ where: { code } });
  } catch (e) {
    console.error("coupon lookup error", e);
    return { ok: false, error: "Couldn't validate that code." };
  }

  if (!c || !c.active) return { ok: false, error: "That code isn't valid." };
  if (c.expiresAt && c.expiresAt.getTime() < Date.now())
    return { ok: false, error: "That code has expired." };
  if (c.maxRedemptions != null && c.timesRedeemed >= c.maxRedemptions)
    return { ok: false, error: "That code has been fully redeemed." };
  if (subtotalCents < c.minSubtotalCents)
    return {
      ok: false,
      error: `Spend ${fmtPrice(c.minSubtotalCents)} to use this code.`,
    };

  const raw =
    c.kind === "PERCENT" ? Math.round((subtotalCents * c.value) / 100) : c.value;
  const discountCents = Math.min(Math.max(0, raw), subtotalCents); // clamp 0..subtotal

  return { ok: true, couponId: c.id, code: c.code, discountCents };
}
