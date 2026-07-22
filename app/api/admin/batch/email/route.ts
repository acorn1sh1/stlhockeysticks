import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/admin";
import { sendEmail, emailConfigured } from "@/lib/email";

// Email everyone in a batch — e.g. "your sticks are ready for pickup" or a
// batch-wide update. Sends one message per recipient (distinct emails), so
// customers never see each other's addresses. Excludes cancelled/refunded and
// never-paid orders by default; pass ?all=1 to include every order in the batch.
export const dynamic = "force-dynamic";

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!emailConfigured()) {
    return NextResponse.json(
      { error: "Email isn't configured (set RESEND_API_KEY + ALERT_EMAIL)." },
      { status: 400 }
    );
  }

  const b = (await req.json().catch(() => ({}))) as {
    batchId?: string;
    subject?: string;
    message?: string;
    includeAll?: boolean;
  };
  const subject = typeof b.subject === "string" ? b.subject.trim().slice(0, 200) : "";
  const message = typeof b.message === "string" ? b.message.trim().slice(0, 5000) : "";
  if (!b.batchId || !subject || !message) {
    return NextResponse.json(
      { error: "batchId, subject, and message are required" },
      { status: 400 }
    );
  }

  const batch = await prisma.batch.findUnique({ where: { id: b.batchId } });
  if (!batch) return NextResponse.json({ error: "Batch not found" }, { status: 404 });

  // Default: real customers (exclude never-paid / cancelled / refunded).
  const EXCLUDED = ["PENDING_PAYMENT", "CANCELLED", "REFUNDED"] as const;
  const orders = await prisma.order.findMany({
    where: b.includeAll
      ? { batchId: b.batchId }
      : { batchId: b.batchId, status: { notIn: [...EXCLUDED] } },
    select: { email: true, name: true },
  });

  // De-dupe by lowercased email; keep the first name we see for greeting.
  const byEmail = new Map<string, string>();
  for (const o of orders) {
    const email = (o.email ?? "").trim();
    if (email && !byEmail.has(email.toLowerCase())) byEmail.set(email.toLowerCase(), o.name ?? "");
  }
  const recipients = [...byEmail.entries()];
  if (recipients.length === 0) {
    return NextResponse.json({ error: "No recipients in this batch." }, { status: 400 });
  }

  const bodyHtml = escapeHtml(message).replace(/\n/g, "<br>");
  let sent = 0;
  const failed: string[] = [];
  for (const [email, name] of recipients) {
    const greeting = name ? `<p>Hi ${escapeHtml(name.split(" ")[0])},</p>` : "";
    const html = `${greeting}<div>${bodyHtml}</div><p style="margin-top:24px;color:#666;font-size:12px">STL Hockey Sticks · ${escapeHtml(batch.name)}</p>`;
    const ok = await sendEmail({ to: email, subject, html });
    if (ok) sent++;
    else failed.push(email);
  }

  return NextResponse.json({ ok: true, sent, failed, total: recipients.length });
}
