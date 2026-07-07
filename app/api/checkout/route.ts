import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createHostedCheckout } from "@/lib/clover";
import { getOrCreateOpenBatch } from "@/lib/batch";
import { validateCoupon } from "@/lib/coupons";
import {
  CATALOG,
  clubDiscountCents,
  optionsSummary,
  unitPriceCents,
  validateOptions,
  type SelectedOptions,
} from "@/lib/catalog";
import { withDbOptions } from "@/lib/options";
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
    lines?: { slug: string; quantity: number; options?: SelectedOptions }[];
  } | null;

  if (!body?.email || !body?.name || !body?.lines?.length) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const slugs = [...new Set(body.lines.map((l) => l.slug))];
  const products = await prisma.product.findMany({
    where: { slug: { in: slugs }, active: true },
  });
  if (products.length !== slugs.length) {
    return NextResponse.json({ error: "Unknown product in cart" }, { status: 400 });
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
  const discountCents = clubDiscountCents(
    lines.map((l) => ({ slug: l.product.slug, quantity: l.quantity, priceCents: l.unitCents }))
  );

  // Coupon applies on top of any club discount. Re-validated here so a
  // tampered client can never inject a fake discount.
  const afterClub = grossCents - discountCents;
  let couponId: string | null = null;
  let couponCode: string | null = null;
  let couponDiscountCents = 0;
  if (body.couponCode?.trim()) {
    const res = await validateCoupon(body.couponCode, afterClub);
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
      batchId: openBatch?.id ?? null,
      subtotalCents,
      discountCents,
      couponId,
      couponCode,
      couponDiscountCents,
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

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const [firstName, ...rest] = body.name.split(" ");

  try {
    const checkout = await createHostedCheckout({
      customer: {
        email: body.email,
        firstName,
        lastName: rest.join(" ") || undefined,
        phone: body.phone,
      },
      lines: [
        ...lines.map((l) => ({
          name: l.label,
          priceCents: l.unitCents,
          quantity: l.quantity,
        })),
        ...(discountCents > 0
          ? [{ name: "10% Team Donation Discount", priceCents: -discountCents, quantity: 1 }]
          : []),
        ...(couponDiscountCents > 0
          ? [{ name: `Promo ${couponCode}`, priceCents: -couponDiscountCents, quantity: 1 }]
          : []),
      ],
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
