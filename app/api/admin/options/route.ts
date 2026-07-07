import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/admin";
import { invalidateOptionCache } from "@/lib/options";

const KINDS = ["FLEX", "CURVE", "HAND", "COLOR", "LENGTH", "PADDLE"];
const SIZINGS = ["ALL", "SENIOR", "INT", "JR", "YTH"];
const CATEGORIES = ["ALL", "FULL_STICK", "GOALIE"];

// Create / update / deactivate a configurator option value.
//  - id present            → patch (active, upcharge, default, label, sort)
//  - id absent (+kind+value) → create a new option value
export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  try {
    if (typeof b.id === "string" && b.id) {
      const data: Record<string, unknown> = {};
      if (typeof b.active === "boolean") data.active = b.active;
      if (typeof b.isDefault === "boolean") data.isDefault = b.isDefault;
      if (typeof b.label === "string") data.label = b.label.slice(0, 60) || null;
      if (b.upchargeCents != null)
        data.upchargeCents = Math.max(0, Math.floor(Number(b.upchargeCents)));
      if (b.sortOrder != null) data.sortOrder = Math.floor(Number(b.sortOrder));

      // Enforce a single default per (kind, sizing, category) scope.
      if (data.isDefault === true) {
        const row = await prisma.optionValue.findUnique({ where: { id: b.id } });
        if (row) {
          await prisma.optionValue.updateMany({
            where: { kind: row.kind, sizing: row.sizing, category: row.category },
            data: { isDefault: false },
          });
        }
      }
      await prisma.optionValue.update({ where: { id: b.id }, data });
      invalidateOptionCache();
      return NextResponse.json({ ok: true });
    }

    // Create
    const kind = String(b.kind ?? "");
    const value = String(b.value ?? "").trim();
    if (!KINDS.includes(kind) || !value) {
      return NextResponse.json({ error: "kind + value required" }, { status: 400 });
    }
    const sizing = SIZINGS.includes(String(b.sizing)) ? String(b.sizing) : "ALL";
    const category = CATEGORIES.includes(String(b.category)) ? String(b.category) : "ALL";
    const upchargeCents = Math.max(0, Math.floor(Number(b.upchargeCents ?? 0)) || 0);

    await prisma.optionValue.upsert({
      where: { kind_value_sizing_category: { kind: kind as never, value, sizing, category } },
      update: { active: true, upchargeCents },
      create: {
        kind: kind as never,
        value,
        sizing,
        category,
        upchargeCents,
        label: typeof b.label === "string" && b.label ? b.label.slice(0, 60) : null,
        sortOrder: Math.floor(Number(b.sortOrder ?? 99)) || 99,
      },
    });
    invalidateOptionCache();
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("admin options error", e);
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }
}
