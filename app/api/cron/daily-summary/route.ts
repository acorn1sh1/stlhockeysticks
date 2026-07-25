import { NextResponse } from "next/server";
import { runDailySummary } from "@/lib/dailySummary";

// Nightly owner digest, triggered by Vercel Cron (see vercel.json, ~10pm
// Central). Vercel automatically sends `Authorization: Bearer $CRON_SECRET`
// when CRON_SECRET is set, so we gate on it — and in production we refuse to
// run without one, so the endpoint can't be poked to spam the inbox or leak
// order counts.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const res = await runDailySummary();
    return NextResponse.json({ ok: true, ...res });
  } catch (e) {
    console.error("daily-summary cron error", e);
    return NextResponse.json({ error: "Summary failed" }, { status: 500 });
  }
}
