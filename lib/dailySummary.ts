import { prisma } from "./db";
import { sendEmail } from "./email";
import { REVENUE_STATUSES } from "./accounting";
import { renderDailySummary, type SummaryData, type SummaryOrder } from "./dailySummaryRender";

export * from "./dailySummaryRender";

// Nightly owner summary — DB half. Pairs with the pure renderer in
// lib/dailySummaryRender.ts.
//
// Window: a Setting watermark ("daily_summary_last_run") holds the end of the
// last summarized period. Each run covers (watermark, now], so every order and
// claim lands in exactly one nightly email regardless of when Vercel's cron
// actually fires within its scheduled hour. First run (no watermark) falls back
// to the trailing 24h.

const WATERMARK_KEY = "daily_summary_last_run";
const PAID = new Set<string>(REVENUE_STATUSES);

export async function collectDailySummary(now: Date): Promise<SummaryData> {
  const wm = await prisma.setting
    .findUnique({ where: { key: WATERMARK_KEY } })
    .catch(() => null);
  const parsed = wm?.value ? new Date(wm.value) : null;
  const windowStart =
    parsed && !Number.isNaN(parsed.getTime())
      ? parsed
      : new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const orders = await prisma.order.findMany({
    where: { createdAt: { gt: windowStart, lte: now } },
    include: { items: { select: { quantity: true } } },
    orderBy: { createdAt: "asc" },
  });

  const claimsRaw = await prisma.warrantyClaim.findMany({
    where: { createdAt: { gt: windowStart, lte: now } },
    include: { order: { select: { orderNumber: true } } },
    orderBy: { createdAt: "asc" },
  });

  const toOrder = (o: (typeof orders)[number]): SummaryOrder => ({
    orderNumber: o.orderNumber,
    name: o.name,
    email: o.email,
    itemCount: o.items.reduce((s, i) => s + i.quantity, 0),
    totalCents: o.subtotalCents,
    status: o.status,
  });

  return {
    windowStart,
    windowEnd: now,
    paid: orders.filter((o) => PAID.has(o.status)).map(toOrder),
    unpaid: orders.filter((o) => !PAID.has(o.status)).map(toOrder),
    claims: claimsRaw.map((c) => ({
      orderNumber: c.order?.orderNumber ?? null,
      productName: c.productName,
      name: c.name,
      email: c.email,
      description: c.description,
    })),
  };
}

export type DailySummaryResult = {
  sent: boolean;
  paid: number;
  unpaid: number;
  claims: number;
};

/**
 * Collect, email, and advance the watermark. Always sends (even an all-zero
 * night) so a quiet day is positively confirmed. The watermark only advances
 * on a successful send, so a Resend outage means the next run catches up rather
 * than a day being silently dropped.
 */
export async function runDailySummary(now: Date = new Date()): Promise<DailySummaryResult> {
  const data = await collectDailySummary(now);
  const { subject, html } = renderDailySummary(data);

  const sent = await sendEmail({ subject, html }); // to = ALERT_EMAIL (the shop)

  if (sent) {
    await prisma.setting
      .upsert({
        where: { key: WATERMARK_KEY },
        create: { key: WATERMARK_KEY, value: now.toISOString() },
        update: { value: now.toISOString() },
      })
      .catch((e) => console.error("daily summary watermark update failed", e));
  }

  return { sent, paid: data.paid.length, unpaid: data.unpaid.length, claims: data.claims.length };
}
