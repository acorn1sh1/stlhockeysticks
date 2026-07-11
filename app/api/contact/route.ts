import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { clientKey, consumeRateLimit } from "@/lib/rateLimit";
import { sendEmail } from "@/lib/email";

function esc(s: string) {
  return s.replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string,
  );
}

export async function POST(req: Request) {
  if (!consumeRateLimit(`contact:${clientKey(req)}`, { windowMs: 10 * 60 * 1000, max: 5 })) {
    return NextResponse.json({ error: "Too many attempts. Try again shortly." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.name || !body?.email || !body?.subject || !body?.message) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  const name = String(body.name).slice(0, 200);
  const email = String(body.email).slice(0, 200);
  const subject = String(body.subject).slice(0, 200);
  const message = String(body.message).slice(0, 2000);

  try {
    await prisma.contactMessage.create({
      data: { name, email, subject, message },
    });
  } catch (e) {
    console.error("contact db error", e);
    return NextResponse.json({ error: "Database unavailable" }, { status: 500 });
  }

  // Notify the shop. Fire-and-forget — a mail failure must not fail the
  // request, the message is already saved in the DB. reply_to = customer,
  // so hitting Reply in the inbox goes straight back to them.
  sendEmail({
    subject: `Contact form: ${subject}`,
    replyTo: email,
    html:
      `<h2>New contact message</h2>` +
      `<p><strong>From:</strong> ${esc(name)} &lt;${esc(email)}&gt;</p>` +
      `<p><strong>Subject:</strong> ${esc(subject)}</p>` +
      `<p style="white-space:pre-wrap">${esc(message)}</p>`,
  }).catch((e) => console.error("contact email failed", e));

  return NextResponse.json({ ok: true });
}
