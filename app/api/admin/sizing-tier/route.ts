import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/admin";

// Manage the admin-editable SizingTier catalog (Senior/Int/Jr/Youth).
// Note: the dedicated /sticks/{tier} marketing page for a brand-new tier is
// still a small code change (literal Next.js route) — see
// docs/admin-catalog-config-design.md. This table drives OptionValue
// scoping (flex/length pools) and Product.sizingTier assignment, both of
// which work for a new tier with zero code changes.
//  - key + delete:true → hard delete (blocked if any Product references it)
//  - key present       → patch (label, tag, sortOrder, active)
//  - key absent        → create a new tier
export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const key = typeof b.key === "string" ? b.key.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_") : "";

  try {
    if (b.delete === true) {
      if (!key) return NextResponse.json({ error: "key required" }, { status: 400 });
      const inUse = await prisma.product.count({ where: { sizingTier: key } });
      if (inUse > 0) {
        return NextResponse.json(
          { error: `${inUse} product(s) use this tier. Hide it instead of deleting.` },
          { status: 409 }
        );
      }
      await prisma.sizingTier.delete({ where: { key } });
      return NextResponse.json({ ok: true });
    }

    const existing = key ? await prisma.sizingTier.findUnique({ where: { key } }) : null;

    if (existing) {
      const data: Record<string, unknown> = {};
      if (typeof b.label === "string") data.label = b.label.slice(0, 60);
      if (typeof b.tag === "string") data.tag = b.tag.slice(0, 120);
      if (typeof b.active === "boolean") data.active = b.active;
      if (b.sortOrder != null) data.sortOrder = Math.floor(Number(b.sortOrder));
      await prisma.sizingTier.update({ where: { key }, data });
      return NextResponse.json({ ok: true });
    }

    if (!key || typeof b.label !== "string" || !b.label.trim()) {
      return NextResponse.json({ error: "key + label required" }, { status: 400 });
    }
    await prisma.sizingTier.create({
      data: {
        key,
        label: b.label.slice(0, 60),
        tag: typeof b.tag === "string" ? b.tag.slice(0, 120) : "",
        sortOrder: Math.floor(Number(b.sortOrder ?? 99)) || 99,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("admin sizing-tier error", e);
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }
}
