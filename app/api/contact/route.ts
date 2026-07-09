import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { clientKey, consumeRateLimit } from "@/lib/rateLimit";

export async function POST(req: Request) {
  if (!consumeRateLimit(`contact:${clientKey(req)}`, { windowMs: 10 * 60 * 1000, max: 5 })) {
    return NextResponse.json({ error: "Too many attempts. Try again shortly." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.name || !body?.email || !body?.subject || !body?.message) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  try {
    await prisma.contactMessage.create({
      data: {
        name: String(body.name).slice(0, 200),
        email: String(body.email).slice(0, 200),
        subject: String(body.subject).slice(0, 200),
        message: String(body.message).slice(0, 2000),
      },
    });
  } catch (e) {
    console.error("contact db error", e);
    return NextResponse.json({ error: "Database unavailable" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
