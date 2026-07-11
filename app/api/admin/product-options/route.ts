import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/admin";
import { invalidateOptionCache } from "@/lib/options";

// Phase 2 — per-product option overrides. Sets the COMPLETE override set for a
// product in one call:
//   { productId, optionValueIds: string[] }
// Semantics (see ProductOption in schema.prisma + resolver in lib/options.ts):
//   - The override replaces the tier/category-scoped set only for the attribute
//     kinds present among optionValueIds. Kinds with no pinned value keep
//     inheriting the shared set.
//   - Passing an empty array clears ALL overrides → the product fully inherits.
export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const productId = typeof b.productId === "string" ? b.productId : "";
  const ids = Array.isArray(b.optionValueIds)
    ? [...new Set((b.optionValueIds as unknown[]).map(String).filter(Boolean))]
    : null;

  if (!productId || ids === null) {
    return NextResponse.json(
      { error: "productId + optionValueIds[] required" },
      { status: 400 }
    );
  }

  try {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Only accept ids that point at real, active option values.
    const valid = ids.length
      ? await prisma.optionValue.findMany({
          where: { id: { in: ids }, active: true },
          select: { id: true },
        })
      : [];
    const validIds = valid.map((v) => v.id);

    // Replace the product's whole override set atomically.
    await prisma.$transaction([
      prisma.productOption.deleteMany({ where: { productId } }),
      ...(validIds.length
        ? [
            prisma.productOption.createMany({
              data: validIds.map((optionValueId) => ({ productId, optionValueId })),
              skipDuplicates: true,
            }),
          ]
        : []),
    ]);

    invalidateOptionCache();
    return NextResponse.json({ ok: true, count: validIds.length });
  } catch (e) {
    console.error("admin product-options error", e);
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }
}
