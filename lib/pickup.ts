import { prisma } from "./db";
import {
  generateLookupToken,
  isFullyPickedUp,
  lineOutstanding,
  orderOutstanding,
  agingBucket,
  daysWaiting,
  validatePickupLines,
  reservedFromRows,
  OUTSTANDING_STATUSES,
  PICKUPABLE_STATUSES,
  type AgingBucket,
  type PickupLineInput,
} from "./pickupCore";

// ---------------------------------------------------------------------------
// Pickup + reserved-inventory logic — DATABASE half.
//
// Business model recap: local STL pickup only, no shipping. So an order's life
// doesn't end at PAID — the sticks sit on a shelf until somebody drives over
// and takes them. That gap is what this module tracks:
//
//   quantity - qtyPickedUp  =  units RESERVED (physically here, spoken for)
//
// Reserved units are deliberately NOT part of Product.inStock: stocked SKUs
// are decremented at payment (lib/inventory.ts decrementForOrder), and
// pre-order units never enter inStock at all. So `inStock` is already the
// free-to-sell count and cannot be oversold. What was missing is the other
// half of the shelf — this module supplies it, so
//
//   physical on hand  =  Product.inStock (free)  +  reserved (awaiting pickup)
//
// Pure helpers live in ./pickupCore and are re-exported here, so callers can
// keep importing everything from "@/lib/pickup".
// ---------------------------------------------------------------------------

export * from "./pickupCore";


/**
 * Return the order's lookup token, generating and persisting one if the row
 * predates the feature. Safe to call repeatedly.
 */
export async function ensureLookupToken(orderId: string): Promise<string> {
  const existing = await prisma.order.findUnique({
    where: { id: orderId },
    select: { lookupToken: true },
  });
  if (existing?.lookupToken) return existing.lookupToken;
  const token = generateLookupToken();
  await prisma.order.update({ where: { id: orderId }, data: { lookupToken: token } });
  return token;
}

/**
 * Absolute URL of the customer-facing status page for an order token.
 * Falls back to the production host rather than emitting a relative path —
 * these links only ever appear in email, where a relative URL is dead.
 */
export function orderLookupUrl(token: string): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "https://stlhockeysticks.com").replace(
    /\/$/,
    ""
  );
  return `${base}/orders/${token}`;
}

export type RecordPickupResult =
  | { ok: true; eventId: string; fullyPickedUp: boolean; outstanding: number }
  | { ok: false; error: string; status?: number };

/**
 * Record a physical handoff. Transactional: the event, its lines, the
 * per-line counters and the order's derived status all move together, so a
 * mid-flight failure can never leave qtyPickedUp ahead of the audit trail.
 */
export async function recordPickup(
  orderId: string,
  input: { pickedUpBy: string; note?: string | null; lines: PickupLineInput[] }
): Promise<RecordPickupResult> {
  const pickedUpBy = (input.pickedUpBy ?? "").trim().slice(0, 120);
  if (!pickedUpBy) return { ok: false, error: "Who picked it up?", status: 400 };
  const note = (input.note ?? "").trim().slice(0, 500) || null;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      status: true,
      items: { select: { id: true, quantity: true, qtyPickedUp: true } },
    },
  });
  if (!order) return { ok: false, error: "Order not found", status: 404 };

  if (!(PICKUPABLE_STATUSES as readonly string[]).includes(order.status)) {
    return {
      ok: false,
      error: `Can't record a pickup on a ${order.status.replaceAll("_", " ").toLowerCase()} order`,
      status: 409,
    };
  }

  const validated = validatePickupLines(order.items, input.lines);
  if (!validated.ok) return { ok: false, error: validated.error, status: 400 };

  // Project the post-update line state to derive the new order status.
  const nextById = new Map(validated.lines.map((l) => [l.orderItemId, l.nextQtyPickedUp]));
  const projected = order.items.map((i) => ({
    quantity: i.quantity,
    qtyPickedUp: nextById.get(i.id) ?? i.qtyPickedUp,
  }));
  const complete = isFullyPickedUp(projected);
  const outstanding = orderOutstanding(projected);

  const eventId = await prisma.$transaction(async (tx) => {
    const event = await tx.pickupEvent.create({
      data: {
        orderId,
        pickedUpBy,
        note,
        lines: {
          create: validated.lines.map((l) => ({ orderItemId: l.orderItemId, qty: l.qty })),
        },
      },
      select: { id: true },
    });

    for (const l of validated.lines) {
      // Guarded update: the WHERE clause re-checks the value we validated
      // against, so two admins hitting "picked up" at once can't both win.
      const res = await tx.orderItem.updateMany({
        where: { id: l.orderItemId, qtyPickedUp: l.nextQtyPickedUp - l.qty },
        data: { qtyPickedUp: l.nextQtyPickedUp },
      });
      if (res.count === 0) {
        throw new Error("CONCURRENT_PICKUP");
      }
    }

    await tx.order.update({
      where: { id: orderId },
      data: {
        pickedUpBy,
        pickupNote: note,
        // Only a fully collected order flips to PICKED_UP. A correction that
        // re-opens an order drops it back to READY_FOR_PICKUP and clears the
        // completion stamp, so it reappears on the outstanding list.
        status: complete ? "PICKED_UP" : "READY_FOR_PICKUP",
        pickedUpAt: complete ? new Date() : null,
      },
    });

    return event.id;
  }).catch((e: unknown) => {
    if (e instanceof Error && e.message === "CONCURRENT_PICKUP") return null;
    throw e;
  });

  if (!eventId) {
    return { ok: false, error: "That line changed while you were working — reload and retry", status: 409 };
  }

  return { ok: true, eventId, fullyPickedUp: complete, outstanding };
}

/**
 * Reserved units per productId: paid for, physically here, not yet collected.
 */
export async function getReservedMap(): Promise<Record<string, number>> {
  try {
    const rows = await prisma.orderItem.findMany({
      where: { order: { status: { in: [...OUTSTANDING_STATUSES] } } },
      select: { productId: true, quantity: true, qtyPickedUp: true },
    });
    return reservedFromRows(rows);
  } catch (e) {
    console.error("getReservedMap error", e);
    return {};
  }
}

export type OutstandingLine = {
  orderItemId: string;
  productId: string;
  name: string;
  options: unknown;
  quantity: number;
  qtyPickedUp: number;
  outstanding: number;
};

export type OutstandingOrder = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: string;
  batchName: string | null;
  subtotalCents: number;
  createdAt: string;
  readySince: string; // when the customer could first collect
  daysWaiting: number;
  bucket: AgingBucket;
  outstanding: number;
  valueCents: number; // $ still sitting on our shelf for this order
  lines: OutstandingLine[];
};

/**
 * Every order with units still on the shelf, oldest wait first — the
 * "who hasn't picked up their sticks" list.
 */
export async function getOutstandingPickups(now: Date = new Date()): Promise<OutstandingOrder[]> {
  const orders = await prisma.order.findMany({
    where: { status: { in: [...OUTSTANDING_STATUSES] } },
    include: {
      batch: { select: { name: true, pickupStart: true } },
      items: {
        include: { product: { select: { id: true, name: true } } },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return orders
    .map((o) => {
      const lines: OutstandingLine[] = o.items
        .map((it) => ({
          orderItemId: it.id,
          productId: it.productId,
          name: it.product?.name ?? "(deleted product)",
          options: it.options,
          quantity: it.quantity,
          qtyPickedUp: it.qtyPickedUp,
          outstanding: lineOutstanding(it),
        }))
        .filter((l) => l.outstanding > 0);

      // A PAID pre-order isn't collectable until its batch lands, so age it
      // from the batch pickup window rather than the purchase date —
      // otherwise every open pre-order looks 60 days "overdue".
      const readySince =
        o.status === "READY_FOR_PICKUP"
          ? (o.batch?.pickupStart ?? o.createdAt)
          : o.createdAt;
      const days = o.status === "READY_FOR_PICKUP" ? daysWaiting(readySince, now) : 0;

      return {
        id: o.id,
        name: o.name,
        email: o.email,
        phone: o.phone,
        status: o.status,
        batchName: o.batch?.name ?? null,
        subtotalCents: o.subtotalCents,
        createdAt: o.createdAt.toISOString(),
        readySince: readySince.toISOString(),
        daysWaiting: days,
        bucket: agingBucket(days),
        outstanding: lines.reduce((s, l) => s + l.outstanding, 0),
        valueCents: o.items.reduce((s, it) => s + lineOutstanding(it) * it.priceCents, 0),
        lines,
      };
    })
    .filter((o) => o.outstanding > 0)
    .sort((a, b) => b.daysWaiting - a.daysWaiting || a.createdAt.localeCompare(b.createdAt));
}
