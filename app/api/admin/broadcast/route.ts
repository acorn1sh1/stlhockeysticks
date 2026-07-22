import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/admin";
import { sendEmail, emailConfigured } from "@/lib/email";

// Marketing broadcast to opted-in customers. Unlike the per-batch pickup email
// (transactional), this is marketing: it only goes to customers who ticked the
// marketing opt-in at checkout AND haven't unsubscribed, and every message
// carries a working unsubscribe link. Optional batchId narrows to one batch.
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
    subject?: string;
    message?: string;
    batchId?: string;
    preview?: boolean; // count recipients without sending
  };
  const subject = typeof b.subject === "string" ? b.subject.trim().slice(0, 200) : "";
  const message = typeof b.message === "string" ? b.message.trim().slice(0, 8000) : "";
  if (!b.preview && (!subject || !message)) {
    return NextResponse.json({ error: "Subject and message are required" }, { status: 400 });
  }

  // Opted-in customers, optionally scoped to one batch.
  const orders = await prisma.order.findMany({
    where: { marketingOptIn: true, ...(b.batchId ? { batchId: b.batchId } : {}) },
    select: { email: true, name: true },
  });
  const byEmail = new Map<string, string>();
  for (const o of orders) {
    const email = (o.email ?? "").trim();
    if (email && !byEmail.has(email.toLowerCase())) byEmail.set(email.toLowerCase(), o.name ?? "");
  }
  if (byEmail.size === 0) {
    return NextResponse.json({ ok: true, sent: 0, total: 0, skipped: 0, eligible: 0 });
  }

  // Load contact rows to skip unsubscribed + get unsubscribe tokens. Create a
  // contact (with token) for any opted-in email that doesn't have one yet.
  const emails = [...byEmail.keys()];
  const contacts = await prisma.emailContact.findMany({ where: { email: { in: emails } } });
  type Contact = { id: string; email: string; unsubscribed: boolean; unsubToken: string };
  const contactByEmail = new Map<string, Contact>(
    (contacts as Contact[]).map((c) => [c.email.toLowerCase(), c])
  );
  for (const email of emails) {
    if (!contactByEmail.has(email)) {
      const created = (await prisma.emailContact.create({ data: { email } })) as Contact;
      contactByEmail.set(email, created);
    }
  }

  const eligible = emails.filter((e) => !contactByEmail.get(e)?.unsubscribed);
  if (b.preview) {
    return NextResponse.json({ ok: true, eligible: eligible.length, skipped: emails.length - eligible.length });
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const bodyHtml = escapeHtml(message).replace(/\n/g, "<br>");
  let sent = 0;
  const failed: string[] = [];
  for (const email of eligible) {
    const contact = contactByEmail.get(email)!;
    const name = byEmail.get(email) ?? "";
    const greeting = name ? `<p>Hi ${escapeHtml(name.split(" ")[0])},</p>` : "";
    const unsub = `${site}/unsubscribe?token=${encodeURIComponent(contact.unsubToken)}`;
    const html =
      `${greeting}<div>${bodyHtml}</div>` +
      `<hr style="margin:24px 0;border:none;border-top:1px solid #eee">` +
      `<p style="color:#888;font-size:12px">STL Hockey Sticks · St. Louis, MO<br>` +
      `You're getting this because you opted in at checkout. ` +
      `<a href="${unsub}">Unsubscribe</a>.</p>`;
    const ok = await sendEmail({ to: contact.email, subject, html });
    if (ok) sent++;
    else failed.push(contact.email);
  }

  return NextResponse.json({
    ok: true,
    sent,
    failed,
    total: eligible.length,
    skipped: emails.length - eligible.length,
  });
}
