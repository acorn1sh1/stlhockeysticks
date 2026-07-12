import crypto from "crypto";
import { prisma } from "./db";

// Client for pushing this site's orders/expenses up to cornish-core, the
// shared back-office (ledger + CRM) for all Cornish Technologies brands.
//
// Best-effort by design: every call is wrapped so a cornish-core outage can
// NEVER break checkout or admin. If the env isn't configured (e.g. local dev
// without core running), the calls quietly no-op.
//
// Env (see .env.example):
//   CORNISH_CORE_URL      e.g. https://core.cornishtech.com  (or http://localhost:3001)
//   CORNISH_BRAND         "STICKS"
//   INGEST_SECRET_STICKS  same hex secret configured in cornish-core

const BASE = process.env.CORNISH_CORE_URL;
const BRAND = process.env.CORNISH_BRAND || "STICKS";
const SECRET = process.env.INGEST_SECRET_STICKS;

function configured(): boolean {
  return !!BASE && !!SECRET;
}

async function post(path: string, payload: unknown): Promise<void> {
  if (!configured()) return; // no-op when core isn't wired in this environment
  const raw = JSON.stringify(payload);
  const ts = String(Math.floor(Date.now() / 1000));
  const signature = crypto.createHmac("sha256", SECRET!).update(`${ts}.${raw}`).digest("hex");

  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Cornish-Brand": BRAND,
      "X-Cornish-Timestamp": ts,
      "X-Cornish-Signature": signature,
    },
    body: raw,
  });
  if (!res.ok) {
    throw new Error(`cornish-core ${path} responded ${res.status}`);
  }
}

// Push a paid order to the ledger. Idempotent on (brand, siteOrderId) in core,
// so a retried webhook is safe. Called right after the PENDING_PAYMENT -> PAID
// transition. Discounts are already netted into subtotalCents (STL convention),
// so total == subtotal; there is no separate tax/shipping on local pickup.
export async function pushPaidOrder(orderId: string): Promise<void> {
  if (!configured()) return;
  try {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return;
    await post("/api/ingest/order", {
      siteOrderId: order.id,
      status: order.status,
      placedAt: order.createdAt.toISOString(),
      customer: {
        email: order.email,
        name: order.name,
        phone: order.phone ?? undefined,
      },
      subtotalCents: order.subtotalCents,
      discountCents: order.discountCents,
      taxCents: 0,
      shippingCents: 0,
      totalCents: order.subtotalCents,
    });
  } catch (e) {
    // Swallow — the order is already PAID locally; core will backfill later.
    console.error("cornish-core order push failed", orderId, e);
  }
}

// Push a general-ledger expense. Idempotent on (brand, siteExpenseId) in core.
export async function pushExpense(args: {
  siteExpenseId: string;
  date: Date;
  category: string;
  description: string;
  amountCents: number;
}): Promise<void> {
  if (!configured()) return;
  try {
    await post("/api/ingest/expense", {
      siteExpenseId: args.siteExpenseId,
      date: args.date.toISOString(),
      category: args.category,
      description: args.description,
      amountCents: args.amountCents,
    });
  } catch (e) {
    console.error("cornish-core expense push failed", args.siteExpenseId, e);
  }
}
