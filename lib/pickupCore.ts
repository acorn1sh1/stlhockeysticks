import { randomBytes } from "crypto";

// ---------------------------------------------------------------------------
// Pickup + reserved-inventory logic — PURE half.
//
// Deliberately free of any Prisma import so it can be unit-tested (and run
// under plain node) without a generated client or a database. The db-backed
// half lives in lib/pickup.ts, which re-exports everything here.
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
// Pure helpers live at the top and take plain objects so they're unit-testable
// without a database.
// ---------------------------------------------------------------------------

/** Statuses where units are paid for but still sitting on our shelf. */
export const OUTSTANDING_STATUSES = ["PAID", "READY_FOR_PICKUP"] as const;

/** Statuses a pickup may be recorded against (PICKED_UP allows corrections). */
export const PICKUPABLE_STATUSES = ["PAID", "READY_FOR_PICKUP", "PICKED_UP"] as const;

export type PickupLineInput = { orderItemId: string; qty: number };

export type LineState = {
  id: string;
  quantity: number;
  qtyPickedUp: number;
};

// --- pure helpers ----------------------------------------------------------

/** Units of a line still owed to the customer. Never negative. */
export function lineOutstanding(l: { quantity: number; qtyPickedUp: number }): number {
  return Math.max(0, l.quantity - l.qtyPickedUp);
}

/** Units across a whole order still owed to the customer. */
export function orderOutstanding(items: { quantity: number; qtyPickedUp: number }[]): number {
  return items.reduce((sum, l) => sum + lineOutstanding(l), 0);
}

/**
 * True when every line is fully collected. An order with no items is NOT
 * considered picked up — that's a data bug, not a completed handoff, and
 * silently flipping it to PICKED_UP would hide it from the outstanding list.
 */
export function isFullyPickedUp(items: { quantity: number; qtyPickedUp: number }[]): boolean {
  return items.length > 0 && items.every((l) => l.qtyPickedUp >= l.quantity);
}

/** True when some but not all units have been collected. */
export function isPartiallyPickedUp(items: { quantity: number; qtyPickedUp: number }[]): boolean {
  const taken = items.reduce((s, l) => s + l.qtyPickedUp, 0);
  return taken > 0 && !isFullyPickedUp(items);
}

/** Whole days between two instants, floored at 0. */
export function daysWaiting(since: Date, now: Date = new Date()): number {
  const ms = now.getTime() - since.getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}

export type AgingBucket = "0-7" | "8-30" | "31-60" | "60+";

/** Aging bucket for an uncollected order, by days since it went ready. */
export function agingBucket(days: number): AgingBucket {
  if (days <= 7) return "0-7";
  if (days <= 30) return "8-30";
  if (days <= 60) return "31-60";
  return "60+";
}

export type PickupValidation =
  | { ok: true; lines: { orderItemId: string; qty: number; nextQtyPickedUp: number }[] }
  | { ok: false; error: string };

/**
 * Validate a set of requested pickup quantities against current line state.
 *
 * Rules:
 *  - every orderItemId must belong to this order
 *  - qty must be a non-zero integer (negative = correcting an over-recorded
 *    handoff, e.g. "I marked 3 but only 2 left the building")
 *  - resulting qtyPickedUp must land within [0, quantity] — no over-pickup,
 *    no negative history
 *  - duplicate line ids are rejected rather than summed, so a double-submit
 *    can't quietly double-count
 */
export function validatePickupLines(
  items: LineState[],
  requested: PickupLineInput[]
): PickupValidation {
  if (!Array.isArray(requested) || requested.length === 0) {
    return { ok: false, error: "No pickup lines supplied" };
  }

  const byId = new Map(items.map((i) => [i.id, i]));
  const seen = new Set<string>();
  const lines: { orderItemId: string; qty: number; nextQtyPickedUp: number }[] = [];

  for (const r of requested) {
    if (!r || typeof r.orderItemId !== "string" || !r.orderItemId) {
      return { ok: false, error: "Missing orderItemId" };
    }
    if (seen.has(r.orderItemId)) {
      return { ok: false, error: "Duplicate line in request" };
    }
    seen.add(r.orderItemId);

    const item = byId.get(r.orderItemId);
    if (!item) return { ok: false, error: "Line does not belong to this order" };

    const qty = Number(r.qty);
    if (!Number.isInteger(qty)) return { ok: false, error: "Quantity must be a whole number" };
    if (qty === 0) continue; // no-op line, drop it

    const next = item.qtyPickedUp + qty;
    if (next < 0) {
      return { ok: false, error: "Correction would take picked-up below zero" };
    }
    if (next > item.quantity) {
      return {
        ok: false,
        error: `Only ${lineOutstanding(item)} left to pick up on that line`,
      };
    }
    lines.push({ orderItemId: item.id, qty, nextQtyPickedUp: next });
  }

  if (lines.length === 0) return { ok: false, error: "Nothing to record" };
  return { ok: true, lines };
}

/**
 * Reserved (awaiting-pickup) units per productId, from raw line rows.
 * Split out from the query so the arithmetic is testable.
 */
export function reservedFromRows(
  rows: { productId: string; quantity: number; qtyPickedUp: number }[]
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows) {
    const n = lineOutstanding(r);
    if (n > 0) out[r.productId] = (out[r.productId] ?? 0) + n;
  }
  return out;
}

/** High-entropy, URL-safe secret for the guest order-status link. */
export function generateLookupToken(): string {
  return randomBytes(24).toString("base64url");
}

