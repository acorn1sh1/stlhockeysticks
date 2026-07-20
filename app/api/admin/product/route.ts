import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/admin";

// Create / update / hide / delete a product (preorder or in-stock). Sending
// an existing slug updates only the provided fields (e.g. just priceCents,
// or active:false to hide it). A new slug creates a product from scratch —
// no code change needed, including full configurable pre-order sticks
// (set configurable:true + sizingTier and the flex/curve/hand/color picker
// is built from the Pre-Order Options table at render time).
export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const slug =
    typeof b.slug === "string"
      ? b.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-")
      : "";
  if (!slug) return NextResponse.json({ error: "Slug required" }, { status: 400 });

  // Hard delete: only allowed if no order has ever referenced this product —
  // otherwise it'd corrupt order history. Hide (active:false) is always
  // available and is the recommended path for anything with sales history.
  if (b.delete === true) {
    const existing = await prisma.product.findUnique({ where: { slug } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const orderCount = await prisma.orderItem.count({ where: { productId: existing.id } });
    if (orderCount > 0) {
      return NextResponse.json(
        { error: `${orderCount} order(s) reference this product. Hide it instead of deleting.` },
        { status: 409 }
      );
    }
    await prisma.product.delete({ where: { slug } });
    return NextResponse.json({ ok: true, deleted: true });
  }

  const existing = await prisma.product.findUnique({ where: { slug } });

  // Build the patch from whichever fields were provided.
  const data: Record<string, unknown> = {};
  if (typeof b.name === "string") data.name = b.name.slice(0, 200);
  if (typeof b.description === "string") data.description = b.description.slice(0, 1000);
  if (typeof b.category === "string" && b.category) {
    const cat = await prisma.category.findUnique({ where: { key: b.category } });
    if (!cat) return NextResponse.json({ error: "Unknown category" }, { status: 400 });
    data.category = b.category;
  }
  if (b.sizingTier === null) data.sizingTier = null;
  else if (typeof b.sizingTier === "string" && b.sizingTier) {
    const tier = await prisma.sizingTier.findUnique({ where: { key: b.sizingTier } });
    if (!tier) return NextResponse.json({ error: "Unknown sizing tier" }, { status: 400 });
    data.sizingTier = b.sizingTier;
  }
  if (Array.isArray(b.specs)) data.specs = b.specs.filter((s) => typeof s === "string").slice(0, 12).map((s) => String(s).slice(0, 60));
  if (typeof b.badge === "string") data.badge = b.badge.slice(0, 40) || null;
  if (b.badge === null) data.badge = null;
  if (typeof b.configurable === "boolean") data.configurable = b.configurable;
  if (typeof b.imageUrl === "string") data.imageUrl = b.imageUrl.slice(0, 2000) || null;
  if (b.imageUrl === null) data.imageUrl = null;
  if (b.priceCents != null) {
    const p = Math.max(0, Math.floor(Number(b.priceCents)));
    if (!Number.isFinite(p)) return NextResponse.json({ error: "Bad price" }, { status: 400 });
    data.priceCents = p;
  }
  if (b.costCents != null) {
    const c = Math.max(0, Math.floor(Number(b.costCents)));
    if (!Number.isFinite(c)) return NextResponse.json({ error: "Bad cost" }, { status: 400 });
    data.costCents = c;
  }
  if (b.inStock != null) data.inStock = Math.max(0, Math.floor(Number(b.inStock)));
  if (typeof b.preorder === "boolean") {
    data.preorder = b.preorder;
    data.type = b.preorder ? "PREORDER" : "IN_STOCK";
  }
  if (typeof b.active === "boolean") data.active = b.active;
  if (typeof b.comingSoon === "boolean") data.comingSoon = b.comingSoon;
  // Locked build fields for IN_STOCK SKUs (display only, no configurator).
  if (b.fixedFlex != null) data.fixedFlex = b.fixedFlex === "" ? null : Math.floor(Number(b.fixedFlex));
  if (typeof b.fixedCurve === "string") data.fixedCurve = b.fixedCurve || null;
  if (typeof b.fixedHand === "string") data.fixedHand = b.fixedHand || null;
  if (typeof b.fixedColor === "string") data.fixedColor = b.fixedColor || null;
  if (typeof b.fixedLength === "string") data.fixedLength = b.fixedLength || null;

  try {
    if (existing) {
      await prisma.product.update({ where: { slug }, data });
    } else {
      if (!data.name || !data.category || data.priceCents == null) {
        return NextResponse.json(
          { error: "New product needs name, category, and price." },
          { status: 400 }
        );
      }
      await prisma.product.create({
        data: {
          slug,
          name: data.name as string,
          description: (data.description as string) ?? "",
          category: data.category as string,
          sizingTier: (data.sizingTier as string | null) ?? null,
          specs: (data.specs as string[]) ?? [],
          badge: (data.badge as string | null) ?? null,
          // Pre-order (built-to-order) sticks default to configurable so the
          // shopper always gets the flex/curve/hand/color picker, derived from
          // the tier/category Pre-Order Options matrix — no per-stick setup.
          configurable:
            (data.configurable as boolean) ??
            ((data.type as string) ?? "IN_STOCK") === "PREORDER",
          imageUrl: (data.imageUrl as string | null) ?? null,
          priceCents: data.priceCents as number,
          costCents: (data.costCents as number) ?? 0,
          inStock: (data.inStock as number) ?? 0,
          preorder: (data.preorder as boolean) ?? false,
          type: (data.type as "PREORDER" | "IN_STOCK") ?? "IN_STOCK",
          active: (data.active as boolean) ?? true,
          comingSoon: (data.comingSoon as boolean) ?? false,
          fixedFlex: (data.fixedFlex as number | null) ?? null,
          fixedCurve: (data.fixedCurve as string | null) ?? null,
          fixedHand: (data.fixedHand as string | null) ?? null,
          fixedColor: (data.fixedColor as string | null) ?? null,
          fixedLength: (data.fixedLength as string | null) ?? null,
        },
      });
    }
  } catch (e) {
    console.error("admin product error", e);
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
