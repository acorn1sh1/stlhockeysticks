import { NextResponse } from "next/server";
import { ADMIN_COOKIE, adminConfigured, checkPassword, createSessionToken } from "@/lib/admin";
import { clientKey, isRateLimited, recordFailure, recordSuccess } from "@/lib/rateLimit";

export async function POST(req: Request) {
  if (!adminConfigured()) {
    return NextResponse.json(
      { error: "Admin not configured. Set ADMIN_PASSWORD." },
      { status: 500 }
    );
  }

  const key = clientKey(req);
  if (isRateLimited(key)) {
    return NextResponse.json(
      { error: "Too many attempts. Try again in a few minutes." },
      { status: 429 }
    );
  }

  const { password } = (await req.json().catch(() => ({}))) as {
    password?: string;
  };

  if (!password || !checkPassword(password)) {
    recordFailure(key);
    return NextResponse.json({ error: "Wrong password." }, { status: 401 });
  }

  recordSuccess(key);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, createSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8, // 8 hours
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
