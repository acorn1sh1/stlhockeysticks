import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/admin";

// Manage the admin-editable AttributeKind catalog (replaces the old
// `enum OptionKind`: FLEX/CURVE/HAND/COLOR/LENGTH/PADDLE). Adding a row here
// makes a brand-new attribute type (e.g. "GRIP") immediately selectable in
// the Pre-Order Options editor — no migration needed.
//  - key + delete:true → hard delete (blocked if any OptionValue uses it)
//  - key present       → patch (label, unit, sortOrder, active)
//  - key absent        → create a new attribute kind
export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const key = typeof b.key === "string" ? b.key.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_") : "";

  try {
    if (b.delete === true) {
      if (!key) return NextResponse.json({ error: "key required" }, { status: 400 });
      const inUse = await prisma.optionValue.count({ where: { kind: key } });
      if (inUse > 0) {
        return NextResponse.json(
          { error: `${inUse} option value(s) use this attribute. Hide it instead of deleting.` },
          { status: 409 }
        );
      }
      await prisma.attributeKind.delete({ where: { key } });
      return NextResponse.json({ ok: true });
    }

    const existing = key ? await prisma.attributeKind.findUnique({ where: { key } }) : null;

    if (existing) {
      const data: Record<string, unknown> = {};
      if (typeof b.label === "string") data.label = b.label.slice(0, 60);
      if (typeof b.unit === "string") data.unit = b.unit.slice(0, 8);
      if (typeof b.active === "boolean") data.active = b.active;
      if (b.sortOrder != null) data.sortOrder = Math.floor(Number(b.sortOrder));
      await prisma.attributeKind.update({ where: { key }, data });
      return NextResponse.json({ ok: true });
    }

    if (!key || typeof b.label !== "string" || !b.label.trim()) {
      return NextResponse.json({ error: "key + label required" }, { status: 400 });
    }
    await prisma.attributeKind.create({
      data: {
        key,
        label: b.label.slice(0, 60),
        unit: typeof b.unit === "string" ? b.unit.slice(0, 8) : "",
        sortOrder: Math.floor(Number(b.sortOrder ?? 99)) || 99,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("admin attribute-kind error", e);
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }
}
