import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/admin";

// Manage promo codes. action: "create" | "toggle" | "delete".
export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const action = String(b.action ?? "create");

  try {
    if (action === "toggle") {
      if (!b.id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
      await prisma.coupon.update({
        where: { id: String(b.id) },
        data: { active: Boolean(b.active) },
      });
      return NextResponse.json({ ok: true });
    }

    if (action === "delete") {
      if (!b.id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
      await prisma.coupon.delete({ where: { id: String(b.id) } });
      return NextResponse.json({ ok: true });
    }

    // create
    const code = String(b.code ?? "").trim().toUpperCase();
    const kind = String(b.kind ?? "");
    const value = Math.floor(Number(b.value));
    if (!code || !["PERCENT", "FIXED"].includes(kind) || !Number.isFinite(value) || value <= 0) {
      return NextResponse.json({ error: "Code, kind, and a positive value are required." }, { status: 400 });
    }
    if (kind === "PERCENT" && value > 100) {
      return NextResponse.json({ error: "Percent must be 1–100." }, { status: 400 });
    }
    await prisma.coupon.create({
      data: {
        code,
        kind: kind as never,
        value, // percent OR cents
        minSubtotalCents: Math.max(0, Math.floor(Number(b.minSubtotalCents ?? 0))),
        maxRedemptions:
          b.maxRedemptions != null && b.maxRedemptions !== ""
            ? Math.max(1, Math.floor(Number(b.maxRedemptions)))
            : null,
        expiresAt: b.expiresAt ? new Date(String(b.expiresAt)) : null,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = (e as { code?: string })?.code === "P2002" ? "That code already exists." : "Save failed";
    console.error("admin coupon error", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
