import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import BatchBanner from "@/components/BatchBanner";
import { getStockMap } from "@/lib/inventory";
import { getMergedCatalog } from "@/lib/products";
import { type TierKey, getTier } from "@/lib/sizeTiers";
import { notFound } from "next/navigation";

// Renders a single-size landing page (e.g. /sticks/senior): only the
// builds for that tier, split clearly into what ships today vs what's
// on the next pre-order batch. Kept separate from the combined /sticks
// page so clicking "Senior" doesn't dump the visitor into every size
// at once.
export default async function SizeTierPage({ tier }: { tier: TierKey }) {
  const def = getTier(tier);
  if (!def) notFound();

  const [stockMap, catalog] = await Promise.all([
    getStockMap(),
    getMergedCatalog(),
  ]);

  const items = catalog.filter(def.match);
  const shipsNow = items.filter((c) => c.inStock);
  const preorder = items.filter((c) => c.options);

  return (
    <>
      <BatchBanner />
      <section className="mx-auto max-w-6xl px-4 py-12">
        <Link href="/sticks" className="text-sm font-bold text-black/50 hover:text-ink">
          ← All sticks
        </Link>
        <h1 className="mt-4 text-4xl font-black tracking-tight">{def.label} Sticks</h1>
        <p className="mt-2 max-w-2xl text-black/60">{def.tag}.</p>

        {shipsNow.length > 0 && (
          <>
            <h2 id="in-stock" className="mt-10 scroll-mt-24 text-2xl font-black">
              In Stock <span className="text-volt-dark">— Pick Up Now</span>
            </h2>
            <p className="mt-1 text-sm text-black/50">
              Built and sitting on the shelf today — no batch wait.
            </p>
            <div className="mt-4 grid gap-6 md:grid-cols-3">
              {shipsNow.map((item) => (
                <ProductCard
                  key={item.slug}
                  item={item}
                  stock={stockMap[item.slug]?.inStock ?? 0}
                />
              ))}
            </div>
          </>
        )}

        {preorder.length > 0 && (
          <>
            <div className="mt-12 flex items-center gap-2">
              <h2 className="scroll-mt-24 text-2xl font-black">
                Pick Your Build
              </h2>
              <span className="rounded-full bg-ink px-3 py-1 text-xs font-bold text-volt">
                Pre-order — Next Batch
              </span>
            </div>
            <p className="mt-1 text-sm text-black/50">
              Built to order — pick flex, curve, hand, and color, then reserve
              your spot in this month&apos;s batch.
            </p>
            <div className="mt-4 grid gap-6 md:grid-cols-3">
              {preorder.map((item) => (
                <ProductCard key={item.slug} item={item} />
              ))}
            </div>
          </>
        )}
      </section>
    </>
  );
}
