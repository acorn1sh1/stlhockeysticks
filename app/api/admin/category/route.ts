import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/admin";

// Manage the admin-editable Category catalog (replaces the old Prisma enum).
//  - key + delete:true  → hard delete (blocked if any Product references it)
//  - key present        → patch (label, sortOrder, active)
//  - key absent         → create a new category
export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const key = typeof b.key === "string" ? b.key.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_") : "";

  try {
    if (b.delete === true) {
      if (!key) return NextResponse.json({ error: "key required" }, { status: 400 });
      const inUse = await prisma.product.count({ where: { category: key } });
      if (inUse > 0) {
        return NextResponse.json(
          { error: `${inUse} product(s) use this category. Hide it instead of deleting.` },
          { status: 409 }
        );
      }
      await prisma.category.delete({ where: { key } });
      return NextResponse.json({ ok: true });
    }

    const existing = key ? await prisma.category.findUnique({ where: { key } }) : null;

    if (existing) {
      const data: Record<string, unknown> = {};
      if (typeof b.label === "string") data.label = b.label.slice(0, 60);
      if (typeof b.active === "boolean") data.active = b.active;
      if (b.sortOrder != null) data.sortOrder = Math.floor(Number(b.sortOrder));
      await prisma.category.update({ where: { key }, data });
      return NextResponse.json({ ok: true });
    }

    if (!key || typeof b.label !== "string" || !b.label.trim()) {
      return NextResponse.json({ error: "key + label required" }, { status: 400 });
    }
    await prisma.category.create({
      data: {
        key,
        label: b.label.slice(0, 60),
        sortOrder: Math.floor(Number(b.sortOrder ?? 99)) || 99,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("admin category error", e);
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }
}
