import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createHostedCheckout } from "@/lib/clover";
import {
  CATALOG,
  optionsSummary,
  unitPriceCents,
  validateOptions,
  type SelectedOptions,
} from "@/lib/catalog";

// Creates a Clover Hosted Checkout session.
// Server re-prices every line from the DB + catalog config —
// client prices are never trusted.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    email?: string;
    name?: string;
    phone?: string;
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
    if (!cat) {
      return NextResponse.json({ error: "Unknown product in cart" }, { status: 400 });
    }
    const err = validateOptions(cat, l.options);
    if (err) {
      return NextResponse.json(
        { error: `${product.name}: ${err}` },
        { status: 400 }
      );
    }
    const qty = Math.min(Math.max(1, Math.floor(l.quantity)), 50);
    // base price from DB, upcharges from catalog config
    const unitCents =
      product.priceCents + (unitPriceCents(cat, l.options) - cat.priceCents);
    const summary = optionsSummary(l.options);
    lines.push({
      product,
      quantity: qty,
      options: l.options,
      unitCents,
      label: summary ? `${product.name} (${summary})` : product.name,
    });
  }

  const subtotalCents = lines.reduce((n, l) => n + l.unitCents * l.quantity, 0);

  // Attach to open batch if any line can't be covered by on-hand stock
  const openBatch = await prisma.batch.findFirst({ where: { status: "OPEN" } });
  const needsBatch = lines.some((l) => l.product.inStock < l.quantity);

  const order = await prisma.order.create({
    data: {
      email: body.email,
      name: body.name,
      phone: body.phone,
      batchId: needsBatch ? openBatch?.id : null,
      subtotalCents,
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
      lines: lines.map((l) => ({
        name: l.label,
        priceCents: l.unitCents,
        quantity: l.quantity,
      })),
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
