import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createHostedCheckout } from "@/lib/clover";
import { getOrCreateOpenBatch } from "@/lib/batch";
import { validateCoupon } from "@/lib/coupons";
import { generateLookupToken } from "@/lib/pickup";
import {
  batchDiscountCents,
  CATALOG,
  CLUB_STICK_SLUG,
  clubDiscountCents,
  optionsSummary,
  unitPriceCents,
  validateOptions,
  type SelectedOptions,
} from "@/lib/catalog";
import { withDbOptions, getActiveClubs } from "@/lib/options";
import { clientKey, consumeRateLimit } from "@/lib/rateLimit";

// Creates a Clover Hosted Checkout session.
// Server re-prices every line from the DB + catalog config —
// client prices are never trusted.
export async function POST(req: Request) {
  // Each hit creates a DB order + calls the Clover API — throttle so this
  // can't be used to spam orders or burn Clover API quota.
  if (!consumeRateLimit(`checkout:${clientKey(req)}`, { windowMs: 10 * 60 * 1000, max: 15 })) {
    return NextResponse.json(
      { error: "Too many checkout attempts. Please wait a few minutes and try again." },
      { status: 429 }
    );
  }

  const body = (await req.json().catch(() => null)) as {
    email?: string;
    name?: string;
    phone?: string;
    couponCode?: string;
    marketingOptIn?: boolean;
    lines?: { slug: string; quantity: number; options?: SelectedOptions }[];
  } | null;

  if (!body?.email || !body?.name || !body?.lines?.length) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const slugs = [...new Set(body.lines.map((l) => l.slug))];
  // comingSoon products are visible teasers only — never purchasable. Exception:
  // the custom club mini, whose readiness is gated per-club (active Clubs), not
  // by the product's own comingSoon flag — its club selection is validated below.
  const products = (
    await prisma.product.findMany({
      where: { slug: { in: slugs }, active: true },
    })
  ).filter((p) => !p.comingSoon || p.slug === CLUB_STICK_SLUG);
  if (products.length !== slugs.length) {
    return NextResponse.json({ error: "Unknown product in cart" }, { status: 400 });
  }

  // The custom club mini must carry a currently-active club. Blocks stale carts
  // (a club retired between add-to-cart and checkout) and hand-crafted requests.
  const clubLine = body.lines.find((l) => l.slug === CLUB_STICK_SLUG);
  if (clubLine) {
    const activeClubs = await getActiveClubs();
    const chosen = clubLine.options?.club;
    if (!chosen || !activeClubs.some((c) => c.name === chosen)) {
      return NextResponse.json(
        { error: "Pick an available club for the club mini." },
        { status: 400 }
      );
    }
  }

  // Validate options + compute unit prices (DB base price + catalog upcharges)
  const lines: {
    product: (typeof products)[number];
    quantity: number;
    options?: SelectedOptions;
    unitCents: number;
    label: string;
  }[] = [];

  for (const l of body.lines) {
    const product = products.find((x) => x.slug === l.slug)!;
    const cat = CATALOG.find((c) => c.slug === l.slug);
    const qty = Math.min(Math.max(1, Math.floor(l.quantity)), 50);

    // Admin-added products aren't in the static catalog: they carry no
    // configurable options, so price is simply the DB base price.
    if (!cat) {
      const summary = optionsSummary(l.options);
      lines.push({
        product,
        quantity: qty,
        options: undefined,
        unitCents: product.priceCents,
        label: summary ? `${product.name} (${summary})` : product.name,
      });
      continue;
    }

    // Validate + price against the same admin-editable DB option matrix the
    // configurator renders (includes length; falls back to static options).
    const configured = await withDbOptions(cat);
    const err = validateOptions(configured, l.options);
    if (err) {
      return NextResponse.json(
        { error: `${product.name}: ${err}` },
        { status: 400 }
      );
    }
    // base price from DB, upcharges from catalog config
    const unitCents =
      product.priceCents + (unitPriceCents(configured, l.options) - configured.priceCents);
    const summary = optionsSummary(l.options);
    lines.push({
      product,
      quantity: qty,
      options: l.options,
      unitCents,
      label: summary ? `${product.name} (${summary})` : product.name,
    });
  }

  const grossCents = lines.reduce((n, l) => n + l.unitCents * l.quantity, 0);
  const discountLineInput = lines.map((l) => ({
    slug: l.product.slug,
    quantity: l.quantity,
    priceCents: l.unitCents,
    category: l.product.category,
  }));
  const clubCents = clubDiscountCents(discountLineInput);
  // First-batch launch discount — re-computed server-side (tier + deadline)
  // so a tampered client can't fake a tier or beat the Aug 1 cutoff.
  const batchCents = batchDiscountCents(discountLineInput);
  // Both are order-level bulk discounts netted into subtotalCents (see
  // Order.discountCents). Folded proportionally into the Clover line
  // prices below rather than sent as their own line — see cloverLines.
  const discountCents = clubCents + batchCents;

  // Coupon applies on top of any bulk discount. Re-validated here so a
  // tampered client can never inject a fake discount.
  const afterClub = grossCents - discountCents;
  let couponId: string | null = null;
  let couponCode: string | null = null;
  let couponDiscountCents = 0;
  if (body.couponCode?.trim()) {
    const totalQty = lines.reduce((n, l) => n + l.quantity, 0);
    const res = await validateCoupon(body.couponCode, afterClub, totalQty);
    if (!res.ok) {
      return NextResponse.json({ error: res.error }, { status: 400 });
    }
    couponId = res.couponId;
    couponCode = res.code;
    couponDiscountCents = res.discountCents;
  }

  const subtotalCents = afterClub - couponDiscountCents;

  // Attach to the correct monthly batch if any line can't be covered by on-hand stock
  const needsBatch = lines.some((l) => l.product.inStock < l.quantity);
  const openBatch = needsBatch ? await getOrCreateOpenBatch() : null;

  const order = await prisma.order.create({
    data: {
      email: body.email,
      name: body.name,
      phone: body.phone,
      marketingOptIn: body.marketingOptIn === true,
      batchId: openBatch?.id ?? null,
      subtotalCents,
      discountCents,
      couponId,
      couponCode,
      couponDiscountCents,
      // Guest-checkout status link (/orders/[token]). Minted up front so the
      // confirmation email always has one.
      lookupToken: generateLookupToken(),
      items: {
        create: lines.map((l) => ({
          productId: l.product.id,
          quantity: l.quantity,
          priceCents: l.unitCents,
          options: l.options ? JSON.parse(JSON.stringify(l.options)) : undefined,
        })),
      },
    },
  });

  // Ensure a marketing contact record exists (create-only — never resets a
  // prior unsubscribe). Gives every customer a stable unsubscribe token.
  // Consent itself is tracked on the order's marketingOptIn.
  try {
    await prisma.emailContact.upsert({
      where: { email: body.email },
      create: { email: body.email },
      update: {},
    });
  } catch (e) {
    console.error("emailContact upsert failed (non-fatal)", e);
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const [firstName, ...rest] = body.name.split(" ");

  // Clover's Hosted Checkout API has no discount field and rejects negative
  // shoppingCart.lineItems[].price ("Line item prices should be positive"),
  // so the old approach of sending club/batch/coupon discounts as their own
  // negative-price line never actually worked. Instead, distribute the
  // total discount proportionally across the real product lines and fold
  // it into each line's price. Largest-remainder rounding guarantees the
  // lineItems sum lands on exactly `subtotalCents` (what's recorded on the
  // Order and what cornish-core's ledger expects), never off by a cent.
  const totalDiscountCents = discountCents + couponDiscountCents;
  const cloverLines =
    totalDiscountCents <= 0
      ? lines.map((l) => ({
          name: l.label,
          priceCents: l.unitCents,
          quantity: l.quantity,
        }))
      : (() => {
          const lineGross = lines.map((l) => l.unitCents * l.quantity);
          const raw = lineGross.map((g) => (g * totalDiscountCents) / grossCents);
          const floors = raw.map(Math.floor);
          const remainder = Math.round(
            totalDiscountCents - floors.reduce((a, b) => a + b, 0)
          );
          // Hand the leftover cents to the lines with the largest
          // fractional remainder first so the discount total lands exactly.
          const byFrac = raw
            .map((r, i) => ({ i, frac: r - Math.floor(r) }))
            .sort((a, b) => b.frac - a.frac);
          const shares = [...floors];
          for (let k = 0; k < remainder; k++) shares[byFrac[k % byFrac.length].i] += 1;
          // unitQty forced to 1 (quantity baked into the price) so each
          // line's discounted total is an exact integer with no per-unit
          // division rounding.
          return lines.map((l, i) => ({
            name: l.quantity > 1 ? `${l.label} × ${l.quantity}` : l.label,
            priceCents: Math.max(0, lineGross[i] - shares[i]),
            quantity: 1,
          }));
        })();

  try {
    const checkout = await createHostedCheckout({
      customer: {
        email: body.email,
        firstName,
        lastName: rest.join(" ") || undefined,
        phone: body.phone,
      },
      lines: cloverLines,
      redirectUrls: {
        success: `${site}/checkout/success?order=${order.id}`,
        failure: `${site}/checkout/failed?order=${order.id}`,
        cancel: `${site}/cart`,
      },
    });

    await prisma.order.update({
      where: { id: order.id },
      data: { cloverCheckoutId: checkout.checkoutSessionId },
    });

    return NextResponse.json({ url: checkout.href, orderId: order.id });
  } catch (e) {
    console.error("clover error", e);
    await prisma.order.update({
      where: { id: order.id },
      data: { status: "CANCELLED" },
    });
    return NextResponse.json(
      { error: "Payment processor unavailable. Try again shortly." },
      { status: 502 }
    );
  }
}
