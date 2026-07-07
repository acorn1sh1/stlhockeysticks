import { prisma } from "./db";
import { fmtPrice } from "./catalog";

export type CouponResult =
  | { ok: true; couponId: string; code: string; discountCents: number }
  | { ok: false; error: string };

type Tier = { minQty: number; percent: number };

function parseTiers(raw: unknown): Tier[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((t) => ({ minQty: Number((t as Tier)?.minQty), percent: Number((t as Tier)?.percent) }))
    .filter((t) => Number.isFinite(t.minQty) && Number.isFinite(t.percent) && t.minQty > 0)
    .sort((a, b) => a.minQty - b.minQty);
}

// Validate a coupon against a given (pre-coupon) subtotal + cart quantity
// and return the discount it would apply. `quantity` only matters for
// TIERED_PERCENT codes (PERCENT/FIXED ignore it) — defaults to 1 so callers
// that don't track quantity (older tests, etc.) still work for those kinds.
// Used both for the cart preview and — re-run — server-side at checkout so
// a client can never fake a discount or a higher tier than it qualifies for.
export async function validateCoupon(
  codeRaw: string,
  subtotalCents: number,
  quantity = 1
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
  if (c.startsAt && c.startsAt.getTime() > Date.now())
    return { ok: false, error: "That code isn't active yet." };
  if (c.expiresAt && c.expiresAt.getTime() < Date.now())
    return { ok: false, error: "That code has expired." };
  if (c.maxRedemptions != null && c.timesRedeemed >= c.maxRedemptions)
    return { ok: false, error: "That code has been fully redeemed." };
  if (subtotalCents < c.minSubtotalCents)
    return {
      ok: false,
      error: `Spend ${fmtPrice(c.minSubtotalCents)} to use this code.`,
    };

  let percent: number | null = null;
  if (c.kind === "TIERED_PERCENT") {
    const tiers = parseTiers(c.tiers);
    const qty = Math.max(1, Math.floor(quantity));
    const match = [...tiers].reverse().find((t) => qty >= t.minQty);
    if (!match) {
      const lowest = tiers[0]?.minQty ?? 1;
      return { ok: false, error: `Add ${Math.max(0, lowest - qty)} more to qualify for this code.` };
    }
    percent = match.percent;
  }

  const raw =
    c.kind === "TIERED_PERCENT"
      ? Math.round((subtotalCents * (percent ?? 0)) / 100)
      : c.kind === "PERCENT"
        ? Math.round((subtotalCents * c.value) / 100)
        : c.value;
  const discountCents = Math.min(Math.max(0, raw), subtotalCents); // clamp 0..subtotal

  return { ok: true, couponId: c.id, code: c.code, discountCents };
}
