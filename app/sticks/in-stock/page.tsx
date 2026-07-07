import type { Metadata } from "next";
import BatchBanner from "@/components/BatchBanner";
import InStockBrowser from "@/components/InStockBrowser";
import { getStockMap } from "@/lib/inventory";
import { getMergedCatalog } from "@/lib/products";

export const metadata: Metadata = {
  title: "In Stock — Pick Up Now",
  description:
    "Composite hockey sticks built and on the shelf in St. Louis. No batch wait — filter by size, flex, curve, hand, and color, then grab it today.",
};

export const dynamic = "force-dynamic";

export default async function InStockPage() {
  const [stockMap, catalog] = await Promise.all([
    getStockMap(),
    getMergedCatalog(),
  ]);

  // Overlay the live on-hand count (server truth) onto each item so client
  // sort/filter on availability uses fresh numbers, then pass a slug→count
  // map to ProductCard for its ships-now / low-stock cues.
  const items = catalog
    .filter((c) => c.inStock)
    .map((c) => ({ ...c, stockCount: stockMap[c.slug]?.inStock ?? c.stockCount ?? 0 }));
  const stockBySlug = Object.fromEntries(
    items.map((c) => [c.slug, c.stockCount ?? 0])
  );

  return (
    <>
      <BatchBanner />
      <section className="mx-auto max-w-6xl px-4 py-12">
        <h1 className="text-4xl font-black tracking-tight">
          In Stock <span className="text-volt-dark">— Pick Up Now</span>
        </h1>
        <p className="mt-2 max-w-2xl text-black/60">
          Built and sitting on the shelf in St. Louis. No batch, no cutoff —
          filter down to the exact build you want and grab it today. Need a
          custom flex, curve, or color?{" "}
          <a href="/sticks" className="font-bold text-volt-dark hover:underline">
            Pre-order a build instead →
          </a>
        </p>
        <InStockBrowser items={items} stockBySlug={stockBySlug} />
      </section>
    </>
  );
}
