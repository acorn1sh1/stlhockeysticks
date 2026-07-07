import { prisma } from "@/lib/db";
import { adminConfigured, isAdmin } from "@/lib/admin";
import AdminLogin from "@/components/admin/AdminLogin";
import AdminDashboard from "@/components/admin/AdminDashboard";
import AdminProducts from "@/components/admin/AdminProducts";
import AdminOptions from "@/components/admin/AdminOptions";
import AdminCategories from "@/components/admin/AdminCategories";
import AdminSizingTiers from "@/components/admin/AdminSizingTiers";
import AdminAttributeKinds from "@/components/admin/AdminAttributeKinds";
import AdminCoupons from "@/components/admin/AdminCoupons";
import AdminWarranty from "@/components/admin/AdminWarranty";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!adminConfigured()) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <h1 className="text-3xl font-black">Admin not configured</h1>
        <p className="mt-3 text-black/60">
          Set an <code className="rounded bg-black/5 px-1">ADMIN_PASSWORD</code>{" "}
          environment variable, then reload this page to sign in.
        </p>
      </div>
    );
  }

  if (!(await isAdmin())) {
    return <AdminLogin />;
  }

  // Stocked SKUs = products that carry real inventory (not built-to-order).
  const stockProducts = await prisma.product.findMany({
    where: { preorder: false, active: true },
    orderBy: { name: "asc" },
    select: { slug: true, name: true, inStock: true, priceCents: true },
  });

  const allProducts = await prisma.product.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
    include: { _count: { select: { orderItems: true } } },
  });

  const categoryRows = await prisma.category.findMany({ orderBy: { sortOrder: "asc" } });
  const sizingTierRows = await prisma.sizingTier.findMany({ orderBy: { sortOrder: "asc" } });
  const attributeKindRows = await prisma.attributeKind.findMany({ orderBy: { sortOrder: "asc" } });

  const batchRows = await prisma.batch.findMany({
    orderBy: { cutoffDate: "desc" },
    take: 12,
    include: { _count: { select: { orders: true } } },
  });

  const orderRows = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { batch: { select: { name: true } } },
  });

  const optionValues = await prisma.optionValue.findMany({
    orderBy: [{ kind: "asc" }, { sizing: "asc" }, { sortOrder: "asc" }],
  });

  const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });

  const claims = await prisma.warrantyClaim.findMany({
    orderBy: { createdAt: "desc" },
    take: 30,
    include: { photos: { select: { mimeType: true, dataBase64: true } } },
  });

  return (
    <div className="space-y-12 pb-16">
      <AdminDashboard
        stock={stockProducts}
        batches={batchRows.map((b) => ({
          id: b.id,
          name: b.name,
          status: b.status,
          cutoffDate: b.cutoffDate.toISOString(),
          pickupStart: b.pickupStart.toISOString(),
          pickupEnd: b.pickupEnd.toISOString(),
          orderCount: b._count.orders,
        }))}
        orders={orderRows.map((o) => ({
          id: o.id,
          name: o.name,
          email: o.email,
          status: o.status,
          subtotalCents: o.subtotalCents,
          createdAt: o.createdAt.toISOString(),
          batchName: o.batch?.name ?? null,
        }))}
        categories={categoryRows.map((c) => c.key)}
      />

      <div className="mx-auto max-w-5xl space-y-12 px-4">
        <AdminProducts
          products={allProducts.map((p) => ({
            id: p.id,
            slug: p.slug,
            name: p.name,
            description: p.description,
            category: p.category,
            sizingTier: p.sizingTier,
            specs: p.specs,
            badge: p.badge,
            imageUrl: p.imageUrl,
            configurable: p.configurable,
            priceCents: p.priceCents,
            inStock: p.inStock,
            preorder: p.preorder,
            active: p.active,
            fixedFlex: p.fixedFlex,
            fixedCurve: p.fixedCurve,
            fixedHand: p.fixedHand,
            fixedColor: p.fixedColor,
            fixedLength: p.fixedLength,
            hasOrders: p._count.orderItems > 0,
          }))}
          categories={categoryRows.map((c) => c.key)}
          sizingTiers={sizingTierRows.map((t) => t.key)}
        />
        <AdminCategories
          categories={categoryRows.map((c) => ({
            id: c.id,
            key: c.key,
            label: c.label,
            sortOrder: c.sortOrder,
            active: c.active,
          }))}
        />
        <AdminSizingTiers
          tiers={sizingTierRows.map((t) => ({
            id: t.id,
            key: t.key,
            label: t.label,
            tag: t.tag,
            sortOrder: t.sortOrder,
            active: t.active,
          }))}
        />
        <AdminAttributeKinds
          kinds={attributeKindRows.map((k) => ({
            id: k.id,
            key: k.key,
            label: k.label,
            unit: k.unit,
            sortOrder: k.sortOrder,
            active: k.active,
          }))}
        />
        <AdminOptions
          options={optionValues.map((o) => ({
            id: o.id,
            kind: o.kind,
            value: o.value,
            label: o.label,
            sizing: o.sizing,
            category: o.category,
            upchargeCents: o.upchargeCents,
            isDefault: o.isDefault,
            sortOrder: o.sortOrder,
            active: o.active,
          }))}
          kinds={attributeKindRows.filter((k) => k.active).map((k) => k.key)}
          sizings={["ALL", ...sizingTierRows.filter((t) => t.active).map((t) => t.key)]}
          categories={["ALL", ...categoryRows.filter((c) => c.active).map((c) => c.key)]}
        />
        <AdminCoupons
          coupons={coupons.map((c) => ({
            id: c.id,
            code: c.code,
            kind: c.kind,
            value: c.value,
            active: c.active,
            minSubtotalCents: c.minSubtotalCents,
            maxRedemptions: c.maxRedemptions,
            timesRedeemed: c.timesRedeemed,
            expiresAt: c.expiresAt ? c.expiresAt.toISOString() : null,
          }))}
        />
        <AdminWarranty
          claims={claims.map((c) => ({
            id: c.id,
            orderId: c.orderId,
            name: c.name,
            email: c.email,
            productName: c.productName,
            description: c.description,
            status: c.status,
            createdAt: c.createdAt.toISOString(),
            photos: c.photos,
          }))}
        />
      </div>
    </div>
  );
}
