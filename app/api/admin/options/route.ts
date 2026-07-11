import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/admin";
import { invalidateOptionCache } from "@/lib/options";

// Valid kinds/sizings/categories now come from the DB (AttributeKind,
// SizingTier, Category tables) instead of hardcoded arrays, so admin can add
// a brand-new attribute type or sizing tier and immediately use it here.
async function validScopes() {
  const [kinds, sizings, cats] = await Promise.all([
    prisma.attributeKind.findMany({ where: { active: true }, select: { key: true } }),
    prisma.sizingTier.findMany({ where: { active: true }, select: { key: true } }),
    prisma.category.findMany({ where: { active: true }, select: { key: true } }),
  ]);
  return {
    KINDS: kinds.map((k) => k.key),
    SIZINGS: ["ALL", ...sizings.map((s) => s.key)],
    CATEGORIES: ["ALL", ...cats.map((c) => c.key)],
  };
}

// Create / update / deactivate a configurator option value.
//  - id present            → patch (active, upcharge, default, label, sort)
//  - id absent (+kind+value) → create a new option value
export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  try {
    // Hard-delete a value. Historical orders store the chosen option as JSON
    // (not an FK), so removing the catalog row is safe for past orders — it
    // just stops offering the value going forward. Also drops any per-product
    // pins referencing it (ProductOption cascade).
    if (typeof b.id === "string" && b.id && b.delete === true) {
      await prisma.optionValue.delete({ where: { id: b.id } });
      invalidateOptionCache();
      return NextResponse.json({ ok: true });
    }

    if (typeof b.id === "string" && b.id) {
      const data: Record<string, unknown> = {};
      if (typeof b.active === "boolean") data.active = b.active;
      if (typeof b.isDefault === "boolean") data.isDefault = b.isDefault;
      if (typeof b.label === "string") data.label = b.label.slice(0, 60) || null;
      if (b.upchargeCents != null)
        data.upchargeCents = Math.max(0, Math.floor(Number(b.upchargeCents)));
      if (b.sortOrder != null) data.sortOrder = Math.floor(Number(b.sortOrder));

      // Rename the value itself (the canonical name shown on the chip). Past
      // orders snapshot their option as JSON, so renaming is safe historically.
      // Guard the (kind, value, sizing, category) uniqueness within scope.
      if (typeof b.value === "string" && b.value.trim()) {
        const nv = b.value.trim().slice(0, 40);
        const row = await prisma.optionValue.findUnique({ where: { id: b.id } });
        if (row && nv !== row.value) {
          const clash = await prisma.optionValue.findFirst({
            where: {
              kind: row.kind,
              value: nv,
              sizing: row.sizing,
              category: row.category,
              id: { not: row.id },
            },
            select: { id: true },
          });
          if (clash) {
            return NextResponse.json(
              { error: `"${nv}" already exists in this tier/category.` },
              { status: 409 }
            );
          }
          data.value = nv;
        }
      }

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
    const { KINDS, SIZINGS, CATEGORIES } = await validScopes();
    const kind = String(b.kind ?? "");
    const value = String(b.value ?? "").trim();
    if (!KINDS.includes(kind) || !value) {
      return NextResponse.json({ error: "kind + value required" }, { status: 400 });
    }
    // Multi-tier bulk add: accept `sizings: string[]` and fan out one
    // OptionValue per selected tier. Falls back to single `sizing` (or ALL)
    // for back-compat. "ALL" in the list collapses to a single ALL row.
    const rawSizings: string[] = Array.isArray(b.sizings)
      ? (b.sizings as unknown[]).map(String)
      : [String(b.sizing ?? "ALL")];
    let sizingList = [...new Set(rawSizings.filter((s) => SIZINGS.includes(s)))];
    if (sizingList.includes("ALL") || sizingList.length === 0) sizingList = ["ALL"];

    const category = CATEGORIES.includes(String(b.category)) ? String(b.category) : "ALL";
    const upchargeCents = Math.max(0, Math.floor(Number(b.upchargeCents ?? 0)) || 0);
    const label = typeof b.label === "string" && b.label ? b.label.slice(0, 60) : null;
    const sortOrder = Math.floor(Number(b.sortOrder ?? 99)) || 99;

    await prisma.$transaction(
      sizingList.map((sizing) =>
        prisma.optionValue.upsert({
          where: { kind_value_sizing_category: { kind, value, sizing, category } },
          update: { active: true, upchargeCents },
          create: { kind, value, sizing, category, upchargeCents, label, sortOrder },
        })
      )
    );
    invalidateOptionCache();
    return NextResponse.json({ ok: true, count: sizingList.length });
  } catch (e) {
    console.error("admin options error", e);
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }
}
