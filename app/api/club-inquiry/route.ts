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
  if (!consumeRateLimit(`club-inquiry:${clientKey(req)}`, { windowMs: 10 * 60 * 1000, max: 5 })) {
    return NextResponse.json({ error: "Too many attempts. Try again shortly." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.clubName || !body?.email || !body?.contact || !body?.message) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  // Who's asking — club, school, team, or other. Defaults to CLUB for old
  // clients that don't send it.
  const ORG_TYPES = new Set(["CLUB", "SCHOOL", "TEAM", "OTHER"]);
  const orgType = ORG_TYPES.has(String(body.orgType)) ? String(body.orgType) : "CLUB";
  // What they're after: custom-logo minis, a bulk full-stick team order
  // (standard builds, no logo), or both. Defaults to MINIS for old clients.
  const INTERESTS = new Set(["MINIS", "FULL_STICKS", "BOTH"]);
  const interest = INTERESTS.has(String(body.interest)) ? String(body.interest) : "MINIS";

  const clubName = String(body.clubName).slice(0, 200);
  const contact = String(body.contact).slice(0, 200);
  const email = String(body.email).slice(0, 200);
  const message = String(body.message).slice(0, 2000);

  try {
    await prisma.clubInquiry.create({
      data: { orgType, interest, clubName, contact, email, message },
    });
  } catch (e) {
    console.error("club-inquiry db error", e);
    return NextResponse.json({ error: "Database unavailable" }, { status: 500 });
  }

  // Notify the shop. Fire-and-forget — the inquiry is already saved, so a mail
  // failure must not fail the request. reply_to = the customer, so a reply in
  // the inbox goes straight back to them. Also visible in /admin → Inquiries.
  const INTEREST_LABEL: Record<string, string> = {
    MINIS: "Custom-logo mini sticks",
    FULL_STICKS: "Bulk full-stick team order",
    BOTH: "Minis + full sticks",
  };
  sendEmail({
    subject: `Club inquiry: ${clubName} (${orgType})`,
    replyTo: email,
    html:
      `<h2>New club / team inquiry</h2>` +
      `<p><strong>Org:</strong> ${esc(clubName)} (${orgType})</p>` +
      `<p><strong>Interested in:</strong> ${INTEREST_LABEL[interest] ?? interest}</p>` +
      `<p><strong>Contact:</strong> ${esc(contact)} &lt;${esc(email)}&gt;</p>` +
      `<p style="white-space:pre-wrap">${esc(message)}</p>`,
  }).catch((e) => console.error("club-inquiry email failed", e));

  return NextResponse.json({ ok: true });
}
