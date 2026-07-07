import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/admin";

const CATEGORIES = ["FULL_STICK", "GOALIE", "MINI_CLUB", "MINI_FUN"];

// Create or update a product. Sending an existing slug updates only the
// provided fields (e.g. just priceCents, or active:false to hide it).
// A new slug creates a simple, non-configurable SKU.
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

  const existing = await prisma.product.findUnique({ where: { slug } });

  // Build the patch from whichever fields were provided.
  const data: Record<string, unknown> = {};
  if (typeof b.name === "string") data.name = b.name.slice(0, 200);
  if (typeof b.description === "string") data.description = b.description.slice(0, 1000);
  if (typeof b.category === "string" && CATEGORIES.includes(b.category))
    data.category = b.category;
  if (b.priceCents != null) {
    const p = Math.max(0, Math.floor(Number(b.priceCents)));
    if (!Number.isFinite(p)) return NextResponse.json({ error: "Bad price" }, { status: 400 });
    data.priceCents = p;
  }
  if (b.inStock != null) data.inStock = Math.max(0, Math.floor(Number(b.inStock)));
  if (typeof b.preorder === "boolean") data.preorder = b.preorder;
  if (typeof b.active === "boolean") data.active = b.active;

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
          category: data.category as never,
          priceCents: data.priceCents as number,
          inStock: (data.inStock as number) ?? 0,
          preorder: (data.preorder as boolean) ?? false,
          active: (data.active as boolean) ?? true,
        },
      });
    }
  } catch (e) {
    console.error("admin product error", e);
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
