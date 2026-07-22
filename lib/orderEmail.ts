import { prisma } from "./db";
import { sendEmail } from "./email";
import { ensureLookupToken, orderLookupUrl, lineOutstanding } from "./pickup";

// Customer-facing transactional email for the pickup lifecycle:
//   paid            -> "we've got your order" + status link
//   batch ARRIVED   -> "come get your sticks" + pickup window + address
//
// Every send is best-effort: the DB is the source of truth and a Resend
// outage must never roll back an order or block a batch status change.
// Callers should `.catch()` or use the fire-and-forget helpers below.

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function pickupAddress(): string {
  return (
    process.env.NEXT_PUBLIC_PICKUP_ADDRESS ??
    "St. Louis, MO (exact address emailed with pickup confirmation)"
  );
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function shell(bodyHtml: string, footerNote?: string): string {
  return `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;line-height:1.5;color:#111">
${bodyHtml}
<p style="margin-top:28px;color:#666;font-size:12px">STL Hockey Sticks · local pickup only${
    footerNote ? ` · ${escapeHtml(footerNote)}` : ""
  }</p>
</div>`;
}

function itemList(
  items: { quantity: number; qtyPickedUp: number; product: { name: string } | null }[],
  { outstandingOnly = false }: { outstandingOnly?: boolean } = {}
): string {
  const rows = items
    .map((it) => {
      const n = outstandingOnly ? lineOutstanding(it) : it.quantity;
      if (n <= 0) return "";
      return `<li>${n}× ${escapeHtml(it.product?.name ?? "Stick")}</li>`;
    })
    .filter(Boolean)
    .join("");
  return rows ? `<ul>${rows}</ul>` : "";
}

/**
 * Order confirmation, sent once payment clears. Carries the status-page link
 * — for a guest checkout this email is the ONLY copy of that link, so it
 * doubles as the customer's receipt and their way back in.
 */
export async function sendOrderConfirmation(orderId: string): Promise<boolean> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      batch: { select: { name: true, pickupStart: true, pickupEnd: true } },
      items: { include: { product: { select: { name: true } } } },
    },
  });
  if (!order?.email) return false;

  const token = await ensureLookupToken(order.id);
  const url = orderLookupUrl(token);
  const first = escapeHtml((order.name ?? "").split(" ")[0] ?? "");

  const timing = order.batch
    ? `<p>These are pre-ordered in the <strong>${escapeHtml(order.batch.name)}</strong>. Expected pickup window: <strong>${fmtDate(order.batch.pickupStart)} – ${fmtDate(order.batch.pickupEnd)}</strong>. We'll email you the moment they land.</p>`
    : `<p>These are in stock and ready whenever you are.</p>`;

  return sendEmail({
    to: order.email,
    subject: "Order confirmed — STL Hockey Sticks",
    html: shell(
      `<h2>Thanks${first ? `, ${first}` : ""}!</h2>
<p>We've got your order.</p>
${itemList(order.items)}
${timing}
<p>Pickup: ${escapeHtml(pickupAddress())}</p>
<p><a href="${url}" style="display:inline-block;background:#111;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none;font-weight:bold">Check your order status</a></p>
<p style="color:#666;font-size:12px">Keep this link — it's how you check on your order without an account.</p>`
    ),
  });
}

/**
 * "Your sticks are here" — sent when a batch flips to ARRIVED. Lists only
 * what's still outstanding, so a customer who already collected part of an
 * order isn't told to come get sticks they're holding.
 */
export async function sendReadyForPickup(orderId: string): Promise<boolean> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      batch: { select: { name: true, pickupStart: true, pickupEnd: true } },
      items: { include: { product: { select: { name: true } } } },
    },
  });
  if (!order?.email) return false;

  const outstanding = order.items.reduce((s, it) => s + lineOutstanding(it), 0);
  if (outstanding <= 0) return false; // nothing left to collect

  const token = await ensureLookupToken(order.id);
  const url = orderLookupUrl(token);
  const first = escapeHtml((order.name ?? "").split(" ")[0] ?? "");
  const window = order.batch
    ? `<p>Pickup window: <strong>${fmtDate(order.batch.pickupStart)} – ${fmtDate(order.batch.pickupEnd)}</strong>.</p>`
    : "";

  const ok = await sendEmail({
    to: order.email,
    subject: "Your sticks are ready for pickup",
    html: shell(
      `<h2>They're here${first ? `, ${first}` : ""}!</h2>
<p>Ready to collect:</p>
${itemList(order.items, { outstandingOnly: true })}
${window}
<p>Pickup: ${escapeHtml(pickupAddress())}</p>
<p><a href="${url}" style="display:inline-block;background:#111;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none;font-weight:bold">View pickup details</a></p>
<p style="color:#666;font-size:12px">Someone else grabbing them for you? No problem — just reply and let us know who.</p>`
    ),
  });

  if (ok) {
    await prisma.order
      .update({ where: { id: order.id }, data: { readyEmailAt: new Date() } })
      .catch(() => {});
  }
  return ok;
}

/**
 * Email every order in a batch that still has units waiting. Returns counts.
 * Skips orders already emailed for this batch (readyEmailAt set) so
 * re-toggling a batch's status doesn't spam customers.
 */
export async function sendBatchReadyEmails(
  batchId: string
): Promise<{ sent: number; skipped: number; failed: number }> {
  const orders = await prisma.order.findMany({
    where: { batchId, status: "READY_FOR_PICKUP", readyEmailAt: null },
    select: { id: true },
  });

  let sent = 0;
  let failed = 0;
  let skipped = 0;
  for (const o of orders) {
    try {
      const ok = await sendReadyForPickup(o.id);
      if (ok) sent++;
      else skipped++;
    } catch (e) {
      console.error("ready-for-pickup email failed", o.id, e);
      failed++;
    }
  }
  return { sent, skipped, failed };
}
