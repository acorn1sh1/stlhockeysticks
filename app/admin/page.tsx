import { prisma } from "@/lib/db";
import { adminConfigured, isAdmin } from "@/lib/admin";
import AdminLogin from "@/components/admin/AdminLogin";
import AdminDashboard from "@/components/admin/AdminDashboard";
import AdminProducts from "@/components/admin/AdminProducts";
import AdminOptions from "@/components/admin/AdminOptions";
import AdminCategories from "@/components/admin/AdminCategories";
import AdminClubs from "@/components/admin/AdminClubs";
import AdminSizingTiers from "@/components/admin/AdminSizingTiers";
import AdminAttributeKinds from "@/components/admin/AdminAttributeKinds";
import AdminCoupons from "@/components/admin/AdminCoupons";
import AdminWarranty from "@/components/admin/AdminWarranty";
import AdminInquiries from "@/components/admin/AdminInquiries";
import AdminCustomers from "@/components/admin/AdminCustomers";
import AdminBroadcast from "@/components/admin/AdminBroadcast";
import AdminTabs from "@/components/admin/AdminTabs";
import AdminAccounting, { type MonthlyRow } from "@/components/admin/AdminAccounting";
import { REVENUE_STATUSES } from "@/lib/accounting";

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
    select: { id: true, slug: true, name: true, inStock: true, priceCents: true },
  });

  const allProducts = await prisma.product.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
    include: { _count: { select: { orderItems: true } } },
  });

  const categoryRows = await prisma.category.findMany({ orderBy: { sortOrder: "asc" } });
  const sizingTierRows = await prisma.sizingTier.findMany({ orderBy: { sortOrder: "asc" } });
  const attributeKindRows = await prisma.attributeKind.findMany({ orderBy: { sortOrder: "asc" } });
  const clubRows = await prisma.club.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });

  const batchRows = await prisma.batch.findMany({
    orderBy: { cutoffDate: "desc" },
    take: 12,
    include: {
      _count: { select: { orders: true } },
      unitCosts: true,
      stockLines: { include: { product: { select: { name: true } } } },
    },
  });

  // ---- Accounting inputs ----
  // Every revenue-recognized order with per-item product costs. COGS uses the
  // batch's unit-cost override when one exists, else the product default.
  const acctOrders = await prisma.order.findMany({
    where: { status: { in: [...REVENUE_STATUSES] } },
    select: {
      subtotalCents: true,
      createdAt: true,
      batchId: true,
      items: {
        select: {
          quantity: true,
          productId: true,
          product: { select: { name: true, costCents: true } },
        },
      },
    },
  });
  const allBatchCosts = await prisma.batch.findMany({
    select: {
      id: true,
      cutoffDate: true,
      freightCents: true,
      tariffCents: true,
      otherCostCents: true,
      unitCosts: { select: { productId: true, unitCostCents: true } },
    },
  });
  const expenseRows = await prisma.expense.findMany({
    orderBy: { date: "desc" },
    take: 200,
    include: { batch: { select: { name: true } } },
  });

  const overridesByBatch = new Map(
    allBatchCosts.map((b) => [b.id, new Map(b.unitCosts.map((u) => [u.productId, u.unitCostCents]))])
  );

  // Confirmed units per batch, aggregated by product (drives the per-batch
  // unit-cost editor and the batch margin line) + monthly P&L rollup.
  const batchProducts = new Map<
    string,
    Map<string, { name: string; qty: number; defaultCostCents: number }>
  >();
  const batchRevenue = new Map<string, number>();
  const monthlyMap = new Map<string, MonthlyRow>();
  const month = (d: Date) => d.toISOString().slice(0, 7);
  const bump = (m: string, k: keyof Omit<MonthlyRow, "month">, v: number) => {
    const row =
      monthlyMap.get(m) ??
      ({ month: m, revenueCents: 0, cogsCents: 0, batchCostsCents: 0, expensesCents: 0 } as MonthlyRow);
    row[k] += v;
    monthlyMap.set(m, row);
  };

  for (const o of acctOrders) {
    const mk = month(o.createdAt);
    bump(mk, "revenueCents", o.subtotalCents);
    if (o.batchId) batchRevenue.set(o.batchId, (batchRevenue.get(o.batchId) ?? 0) + o.subtotalCents);
    const overrides = o.batchId ? overridesByBatch.get(o.batchId) : undefined;
    for (const it of o.items) {
      const unit = overrides?.get(it.productId) ?? it.product.costCents;
      bump(mk, "cogsCents", unit * it.quantity);
      if (o.batchId) {
        const products = batchProducts.get(o.batchId) ?? new Map();
        const p = products.get(it.productId) ?? {
          name: it.product.name,
          qty: 0,
          defaultCostCents: it.product.costCents,
        };
        p.qty += it.quantity;
        products.set(it.productId, p);
        batchProducts.set(o.batchId, products);
      }
    }
  }
  for (const b of allBatchCosts) {
    const extra = b.freightCents + b.tariffCents + b.otherCostCents;
    if (extra) bump(month(b.cutoffDate), "batchCostsCents", extra);
  }
  for (const e of expenseRows) {
    bump(month(e.date), "expensesCents", e.amountCents);
  }
  const monthly = [...monthlyMap.values()].sort((a, b) => b.month.localeCompare(a.month));

  const orderRows = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { batch: { select: { name: true } } },
  });

  // ---- Customer list (CRM) ----
  // Derived from orders, deduped by email. No separate table — always current.
  const customerOrders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      email: true,
      name: true,
      phone: true,
      subtotalCents: true,
      status: true,
      marketingOptIn: true,
      createdAt: true,
      batch: { select: { name: true } },
    },
  });
  const emailContacts = await prisma.emailContact.findMany({
    select: { email: true, unsubscribed: true },
  });
  const unsubscribedSet = new Set(
    emailContacts
      .filter((c: { email: string; unsubscribed: boolean }) => c.unsubscribed)
      .map((c: { email: string; unsubscribed: boolean }) => c.email.toLowerCase())
  );
  const customerMap = new Map<
    string,
    {
      email: string;
      name: string;
      phone: string | null;
      orders: number;
      paidOrders: number;
      spentCents: number;
      firstOrderAt: string;
      lastOrderAt: string;
      batches: Set<string>;
      optedIn: boolean;
    }
  >();
  for (const o of customerOrders) {
    const email = (o.email ?? "").trim();
    if (!email) continue;
    const key = email.toLowerCase();
    const iso = o.createdAt.toISOString();
    const isRevenue = (REVENUE_STATUSES as readonly string[]).includes(o.status);
    const existing = customerMap.get(key);
    if (!existing) {
      customerMap.set(key, {
        email,
        name: o.name ?? "",
        phone: o.phone ?? null,
        orders: 1,
        paidOrders: isRevenue ? 1 : 0,
        spentCents: isRevenue ? o.subtotalCents : 0,
        firstOrderAt: iso,
        lastOrderAt: iso,
        batches: new Set(o.batch?.name ? [o.batch.name] : []),
        optedIn: o.marketingOptIn,
      });
    } else {
      existing.orders += 1;
      if (isRevenue) {
        existing.paidOrders += 1;
        existing.spentCents += o.subtotalCents;
      }
      if (iso < existing.firstOrderAt) existing.firstOrderAt = iso;
      if (iso > existing.lastOrderAt) existing.lastOrderAt = iso;
      if (o.phone && !existing.phone) existing.phone = o.phone;
      if (o.batch?.name) existing.batches.add(o.batch.name);
      if (o.marketingOptIn) existing.optedIn = true;
    }
  }
  const customers = [...customerMap.values()]
    .map((c) => ({
      ...c,
      batches: [...c.batches].sort(),
      // Marketing-eligible = opted in on some order AND not unsubscribed.
      marketing: c.optedIn && !unsubscribedSet.has(c.email.toLowerCase()),
      unsubscribed: unsubscribedSet.has(c.email.toLowerCase()),
    }))
    .sort((a, b) => b.lastOrderAt.localeCompare(a.lastOrderAt));

  const optionValues = await prisma.optionValue.findMany({
    orderBy: [{ kind: "asc" }, { sizing: "asc" }, { sortOrder: "asc" }],
  });

  // Phase 2: per-product option overrides, grouped productId → optionValueId[].
  const productOptionRows = await prisma.productOption.findMany({
    select: { productId: true, optionValueId: true },
  });
  const productOptionsMap: Record<string, string[]> = {};
  for (const r of productOptionRows) {
    (productOptionsMap[r.productId] ||= []).push(r.optionValueId);
  }

  const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });

  // Custom-stick inquiries (clubs/schools/teams) + general contact messages.
  const inquiryRows = await prisma.clubInquiry.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const contactRows = await prisma.contactMessage.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const claims = await prisma.warrantyClaim.findMany({
    orderBy: { createdAt: "desc" },
    take: 30,
    include: { photos: { select: { mimeType: true, dataBase64: true } } },
  });

  // Grouped into tabs so /admin isn't one endless scroll. Order roughly
  // matches day-to-day use: operations first, then catalog, customers, money.
  const dashboardTab = (
    <AdminDashboard
        stock={stockProducts}
        batches={batchRows.map((b) => {
          const overrides = new Map(b.unitCosts.map((u) => [u.productId, u.unitCostCents]));
          const products = [...(batchProducts.get(b.id) ?? new Map()).entries()].map(
            ([productId, p]) => ({
              productId,
              name: p.name,
              qty: p.qty,
              defaultCostCents: p.defaultCostCents,
              overrideCents: overrides.get(productId) ?? null,
            })
          );
          return {
            id: b.id,
            name: b.name,
            status: b.status,
            cutoffDate: b.cutoffDate.toISOString(),
            pickupStart: b.pickupStart.toISOString(),
            pickupEnd: b.pickupEnd.toISOString(),
            orderCount: b._count.orders,
            revenueCents: batchRevenue.get(b.id) ?? 0,
            freightCents: b.freightCents,
            tariffCents: b.tariffCents,
            otherCostCents: b.otherCostCents,
            costNotes: b.costNotes,
            products: products.sort((a, z) => a.name.localeCompare(z.name)),
            stockLines: b.stockLines
              .map((sl) => ({
                productId: sl.productId,
                name: sl.product.name,
                qty: sl.qty,
                received: sl.received,
              }))
              .sort((a, z) => a.name.localeCompare(z.name)),
          };
        })}
        orders={orderRows.map((o) => ({
          id: o.id,
          name: o.name,
          email: o.email,
          status: o.status,
          subtotalCents: o.subtotalCents,
          createdAt: o.createdAt.toISOString(),
          batchId: o.batchId ?? null,
          batchName: o.batch?.name ?? null,
        }))}
        categories={categoryRows.map((c) => ({ key: c.key, label: c.label }))}
        sizingTiers={sizingTierRows.map((t) => ({ key: t.key, label: t.label }))}
        clubs={clubRows.map((c) => c.name)}
        options={optionValues
          .filter((o) => o.active)
          .map((o) => ({
            kind: o.kind,
            value: o.value,
            label: o.label,
            sizing: o.sizing,
            category: o.category,
          }))}
      />
  );

  const financeTab = (
    <>
        <AdminAccounting
          monthly={monthly}
          expenses={expenseRows.map((e) => ({
            id: e.id,
            date: e.date.toISOString(),
            category: e.category,
            description: e.description,
            amountCents: e.amountCents,
            batchId: e.batchId,
            batchName: e.batch?.name ?? null,
          }))}
          batches={batchRows.map((b) => ({ id: b.id, name: b.name }))}
        />
        <AdminCoupons
          coupons={coupons.map((c) => ({
            id: c.id,
            code: c.code,
            kind: c.kind,
            value: c.value,
            tiers: (c.tiers as { minQty: number; percent: number }[] | null) ?? null,
            active: c.active,
            minSubtotalCents: c.minSubtotalCents,
            maxRedemptions: c.maxRedemptions,
            timesRedeemed: c.timesRedeemed,
            startsAt: c.startsAt ? c.startsAt.toISOString() : null,
            expiresAt: c.expiresAt ? c.expiresAt.toISOString() : null,
          }))}
        />
    </>
  );

  const catalogTab = (
    <>
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
            costCents: p.costCents,
            inStock: p.inStock,
            preorder: p.preorder,
            active: p.active,
            comingSoon: p.comingSoon,
            fixedFlex: p.fixedFlex,
            fixedCurve: p.fixedCurve,
            fixedHand: p.fixedHand,
            fixedColor: p.fixedColor,
            fixedLength: p.fixedLength,
            hasOrders: p._count.orderItems > 0,
          }))}
          categories={categoryRows.map((c) => c.key)}
          sizingTiers={sizingTierRows.map((t) => t.key)}
          optionValues={optionValues.map((o) => ({
            id: o.id,
            kind: o.kind,
            value: o.value,
            label: o.label,
            sizing: o.sizing,
            category: o.category,
          }))}
          productOptions={productOptionsMap}
          attributeKinds={attributeKindRows.filter((k) => k.active).map((k) => k.key)}
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
        <AdminClubs
          clubs={clubRows.map((c) => ({
            id: c.id,
            name: c.name,
            active: c.active,
            imageUrl: c.imageUrl,
            sortOrder: c.sortOrder,
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
    </>
  );

  const customersTab = (
    <>
        <AdminCustomers customers={customers} />
        <AdminBroadcast batches={batchRows.map((b) => ({ id: b.id, name: b.name }))} />
        <AdminInquiries
          inquiries={inquiryRows.map((q) => ({
            id: q.id,
            orgType: q.orgType,
            interest: q.interest,
            clubName: q.clubName,
            contact: q.contact,
            email: q.email,
            message: q.message,
            createdAt: q.createdAt.toISOString(),
          }))}
          contacts={contactRows.map((m) => ({
            id: m.id,
            name: m.name,
            email: m.email,
            subject: m.subject,
            message: m.message,
            createdAt: m.createdAt.toISOString(),
          }))}
        />
    </>
  );

  const warrantyTab = (
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
  );

  return (
    <div className="pb-16">
      <AdminTabs
        tabs={[
          { id: "dashboard", label: "Dashboard", content: dashboardTab },
          { id: "catalog", label: "Catalog", content: catalogTab },
          { id: "customers", label: "Customers", content: customersTab },
          { id: "finance", label: "Money", content: financeTab },
          { id: "warranty", label: "Warranty", content: warrantyTab },
        ]}
      />
    </div>
  );
}
