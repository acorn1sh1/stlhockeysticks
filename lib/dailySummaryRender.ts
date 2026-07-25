import { formatOrderNumber } from "./orderNumber";

// Pure rendering for the nightly owner summary email. No prisma/email import,
// so it's unit-testable under plain node. The DB half (collect + send +
// watermark) lives in lib/dailySummary.ts.

export type SummaryOrder = {
  orderNumber: number;
  name: string;
  email: string;
  itemCount: number;
  totalCents: number;
  status: string;
};

export type SummaryClaim = {
  orderNumber: number | null;
  productName: string;
  name: string;
  email: string;
  description: string;
};

export type SummaryData = {
  windowStart: Date;
  windowEnd: Date;
  paid: SummaryOrder[]; // payment confirmed (real sales)
  unpaid: SummaryOrder[]; // started checkout but not paid, plus cancelled/refunded
  claims: SummaryClaim[];
};

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

const esc = (s: string) =>
  s.replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string,
  );

const CENTRAL = "America/Chicago";

function dayLabel(d: Date): string {
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: CENTRAL,
  });
}

function timeLabel(d: Date): string {
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: CENTRAL,
  });
}

/** Sum of confirmed-sale revenue in the window. */
export function summaryRevenueCents(d: SummaryData): number {
  return d.paid.reduce((s, o) => s + o.totalCents, 0);
}

function orderRows(orders: SummaryOrder[], showStatus: boolean): string {
  return orders
    .map(
      (o) =>
        `<tr>` +
        `<td style="padding:4px 12px 4px 0;font-family:monospace">${formatOrderNumber(o.orderNumber)}</td>` +
        `<td style="padding:4px 12px 4px 0">${esc(o.name)}</td>` +
        `<td style="padding:4px 12px 4px 0">${o.itemCount} item${o.itemCount === 1 ? "" : "s"}</td>` +
        `<td style="padding:4px 12px 4px 0;text-align:right">${money(o.totalCents)}</td>` +
        (showStatus
          ? `<td style="padding:4px 0;color:#666">${esc(o.status.replaceAll("_", " ").toLowerCase())}</td>`
          : "") +
        `</tr>`,
    )
    .join("");
}

function section(title: string, body: string): string {
  return `<h3 style="margin:24px 0 8px">${title}</h3>${body}`;
}

/**
 * Build the nightly summary email. Always renders — an empty section prints an
 * explicit "0" line rather than being omitted, so a quiet night is confirmed,
 * not ambiguous.
 */
export function renderDailySummary(d: SummaryData): { subject: string; html: string } {
  const revenue = summaryRevenueCents(d);
  const paidCount = d.paid.length;
  const claimCount = d.claims.length;

  const subject =
    `STL nightly — ${paidCount} paid order${paidCount === 1 ? "" : "s"}, ${money(revenue)}` +
    (claimCount ? ` · ${claimCount} warranty claim${claimCount === 1 ? "" : "s"}` : "") +
    ` (${dayLabel(d.windowEnd)})`;

  // ---- Paid orders ----
  const paidSection = section(
    `Paid orders — ${paidCount}, ${money(revenue)}`,
    paidCount === 0
      ? `<p style="margin:4px 0;color:#666">0 paid orders.</p>`
      : `<table style="border-collapse:collapse;font-size:14px">${orderRows(d.paid, true)}</table>`,
  );

  // ---- Unpaid / other ----
  const unpaidSection = section(
    `Unpaid &amp; abandoned — ${d.unpaid.length}`,
    d.unpaid.length === 0
      ? `<p style="margin:4px 0;color:#666">0 unpaid or abandoned orders.</p>`
      : `<table style="border-collapse:collapse;font-size:14px">${orderRows(d.unpaid, true)}</table>` +
          `<p style="margin:6px 0;color:#999;font-size:12px">Checkout started but payment not confirmed (or cancelled/refunded). Not counted in revenue.</p>`,
  );

  // ---- Warranty ----
  const claimSection = section(
    `Warranty claims — ${claimCount}`,
    claimCount === 0
      ? `<p style="margin:4px 0;color:#666">0 warranty claims.</p>`
      : `<table style="border-collapse:collapse;font-size:14px">` +
          d.claims
            .map(
              (c) =>
                `<tr>` +
                `<td style="padding:4px 12px 4px 0;font-family:monospace">${c.orderNumber != null ? formatOrderNumber(c.orderNumber) : "—"}</td>` +
                `<td style="padding:4px 12px 4px 0">${esc(c.productName)}</td>` +
                `<td style="padding:4px 12px 4px 0">${esc(c.name)}</td>` +
                `<td style="padding:4px 0;color:#666">${esc(c.description.slice(0, 80))}${c.description.length > 80 ? "…" : ""}</td>` +
                `</tr>`,
            )
            .join("") +
          `</table><p style="margin:6px 0;color:#999;font-size:12px">Photos and full details in /admin → Warranty.</p>`,
  );

  const html =
    `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;line-height:1.5;color:#111">` +
    `<h2 style="margin:0 0 4px">Nightly summary — ${dayLabel(d.windowEnd)}</h2>` +
    `<p style="margin:0;color:#666;font-size:13px">Covers ${dayLabel(d.windowStart)} ${timeLabel(d.windowStart)} → ${timeLabel(d.windowEnd)} (Central).</p>` +
    paidSection +
    unpaidSection +
    claimSection +
    `<p style="margin-top:28px;color:#666;font-size:12px">STL Hockey Sticks · automated nightly digest</p>` +
    `</div>`;

  return { subject, html };
}
