import type { Metadata } from "next";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import BatchBanner from "@/components/BatchBanner";
import { getMergedCatalog } from "@/lib/products";

export const metadata: Metadata = {
  title: "Full-Size Composite Sticks",
  description:
    "Senior, intermediate, junior, youth, and goalie composite hockey sticks at wholesale prices. Custom flex, curve, color, and name. Local St. Louis pickup.",
};

export const dynamic = "force-dynamic";

export default async function SticksPage() {
  const catalog = await getMergedCatalog();
  const configurable = catalog.filter((c) => c.options);
  const hasInStock = catalog.some((c) => c.inStock);
  const senior = configurable.filter((c) => c.slug.includes("senior"));
  const intermediate = configurable.filter((c) => c.slug.includes("intermediate"));
  const junior = configurable.filter((c) => c.slug.includes("junior"));
  const youth = configurable.filter((c) => c.slug.includes("youth"));
  const goalie = configurable.filter((c) => c.category === "GOALIE");

  return (
    <>
      <BatchBanner />
      <section className="mx-auto max-w-6xl px-4 py-12">
        <h1 className="text-4xl font-black tracking-tight">Full-Size Sticks</h1>
        <p className="mt-2 max-w-2xl text-black/60">
          Every custom stick is built to order: pick your flex, curve, hand,
          color — even get your name printed on the shaft. Pre-order into
          this month&apos;s batch, pick up in STL.{" "}
          {hasInStock && (
            <>
              Need one tonight?{" "}
              <Link href="/sticks/in-stock" className="font-bold text-volt-dark hover:underline">
                Shop what&apos;s in stock →
              </Link>
            </>
          )}
        </p>

        <div id="senior" className="mt-12 flex scroll-mt-24 flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black">Senior — pick your build</h2>
            <span className="rounded-full bg-ink px-3 py-1 text-xs font-bold text-volt">
              Pre-order — Next Batch
            </span>
          </div>
          <Link href="/sticks/senior" className="text-sm font-bold text-volt-dark hover:underline">
            Senior only →
          </Link>
        </div>
        <div className="mt-4 grid gap-6 md:grid-cols-3">
          {senior.map((item) => (
            <ProductCard key={item.slug} item={item} />
          ))}
        </div>

        <div id="intermediate" className="mt-12 flex scroll-mt-24 flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black">Intermediate — pick your build</h2>
            <span className="rounded-full bg-ink px-3 py-1 text-xs font-bold text-volt">
              Pre-order — Next Batch
            </span>
          </div>
          <Link href="/sticks/intermediate" className="text-sm font-bold text-volt-dark hover:underline">
            Intermediate only →
          </Link>
        </div>
        <div className="mt-4 grid gap-6 md:grid-cols-3">
          {intermediate.map((item) => (
            <ProductCard key={item.slug} item={item} />
          ))}
        </div>

        <div id="junior" className="mt-12 flex scroll-mt-24 flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black">Junior — pick your build</h2>
            <span className="rounded-full bg-ink px-3 py-1 text-xs font-bold text-volt">
              Pre-order — Next Batch
            </span>
          </div>
          <Link href="/sticks/junior" className="text-sm font-bold text-volt-dark hover:underline">
            Junior only →
          </Link>
        </div>
        <div className="mt-4 grid gap-6 md:grid-cols-3">
          {junior.map((item) => (
            <ProductCard key={item.slug} item={item} />
          ))}
        </div>

        <div id="youth" className="mt-12 flex scroll-mt-24 flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black">Youth — pick your build</h2>
            <span className="rounded-full bg-ink px-3 py-1 text-xs font-bold text-volt">
              Pre-order — Next Batch
            </span>
          </div>
          <Link href="/sticks/youth" className="text-sm font-bold text-volt-dark hover:underline">
            Youth only →
          </Link>
        </div>
        <div className="mt-4 grid gap-6 md:grid-cols-3">
          {youth.map((item) => (
            <ProductCard key={item.slug} item={item} />
          ))}
        </div>

        <div id="goalie" className="mt-12 flex scroll-mt-24 flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black">Goalies — pick your build</h2>
            <span className="rounded-full bg-ink px-3 py-1 text-xs font-bold text-volt">
              Pre-order — Next Batch
            </span>
          </div>
          <Link href="/sticks/goalie" className="text-sm font-bold text-volt-dark hover:underline">
            Goalie only →
          </Link>
        </div>
        <div className="mt-4 grid gap-6 md:grid-cols-3">
          {goalie.map((item) => (
            <ProductCard key={item.slug} item={item} />
          ))}
        </div>
      </section>
    </>
  );
}
