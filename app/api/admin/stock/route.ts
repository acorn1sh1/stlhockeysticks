import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/admin";

// Set on-hand stock for a product. Owner-only.
export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { slug, inStock } = (await req.json().catch(() => ({}))) as {
    slug?: string;
    inStock?: number;
  };
  const count = Math.max(0, Math.floor(Number(inStock)));
  if (!slug || !Number.isFinite(count)) {
    return NextResponse.json({ error: "Invalid slug or count" }, { status: 400 });
  }
  try {
    await prisma.product.update({
      where: { slug },
      data: { inStock: count },
    });
  } catch (e) {
    console.error("admin stock update error", e);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, slug, inStock: count });
}
