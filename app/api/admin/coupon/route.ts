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
    if (!code || !["PERCENT", "FIXED", "TIERED_PERCENT"].includes(kind)) {
      return NextResponse.json({ error: "Code and kind are required." }, { status: 400 });
    }

    let value = 0;
    let tiers: { minQty: number; percent: number }[] | undefined;

    if (kind === "TIERED_PERCENT") {
      const rawTiers = Array.isArray(b.tiers) ? b.tiers : [];
      tiers = rawTiers
        .map((t) => ({
          minQty: Math.floor(Number((t as { minQty?: unknown })?.minQty)),
          percent: Math.floor(Number((t as { percent?: unknown })?.percent)),
        }))
        .filter((t) => t.minQty > 0 && t.percent > 0 && t.percent <= 100)
        .sort((a, b2) => a.minQty - b2.minQty);
      if (!tiers.length) {
        return NextResponse.json(
          { error: "At least one valid quantity tier (min qty + percent) is required." },
          { status: 400 }
        );
      }
    } else {
      value = Math.floor(Number(b.value));
      if (!Number.isFinite(value) || value <= 0) {
        return NextResponse.json({ error: "A positive value is required." }, { status: 400 });
      }
      if (kind === "PERCENT" && value > 100) {
        return NextResponse.json({ error: "Percent must be 1–100." }, { status: 400 });
      }
    }

    await prisma.coupon.create({
      data: {
        code,
        kind: kind as never,
        value, // percent OR cents; unused (0) for TIERED_PERCENT
        tiers: tiers as never,
        minSubtotalCents: Math.max(0, Math.floor(Number(b.minSubtotalCents ?? 0))),
        maxRedemptions:
          b.maxRedemptions != null && b.maxRedemptions !== ""
            ? Math.max(1, Math.floor(Number(b.maxRedemptions)))
            : null,
        startsAt: b.startsAt ? new Date(String(b.startsAt)) : null,
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
