import { prisma } from "@/lib/db";
import { adminConfigured, isAdmin } from "@/lib/admin";
import AdminLogin from "@/components/admin/AdminLogin";
import AdminDashboard from "@/components/admin/AdminDashboard";
import AdminProducts from "@/components/admin/AdminProducts";
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
    select: {
      id: true,
      slug: true,
      name: true,
      category: true,
      priceCents: true,
      inStock: true,
      preorder: true,
      active: true,
    },
  });

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
      />

      <div className="mx-auto max-w-5xl space-y-12 px-4">
        <AdminProducts products={allProducts} />
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
