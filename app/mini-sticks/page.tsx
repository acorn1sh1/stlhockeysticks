import type { Metadata } from "next";
import Link from "next/link";
import MiniCard from "@/components/MiniCard";
import BatchBanner from "@/components/BatchBanner";
import { getStockMap } from "@/lib/inventory";
import { getMergedCatalog } from "@/lib/products";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mini Sticks — Club & Fun Series",
  description:
    "Browse mini sticks for St. Louis clubs plus our Fun Series designs. In stock or pre-order into the next batch. Local STL pickup.",
};

export default async function MiniSticksPage() {
  const [stockMap, catalog] = await Promise.all([
    getStockMap(),
    getMergedCatalog(),
  ]);

  const clubs = catalog.filter((c) => c.category === "MINI_CLUB");
  const fun = catalog.filter((c) => c.category === "MINI_FUN");
  const stockOf = (slug: string) => stockMap[slug]?.inStock;

  return (
    <>
      <BatchBanner />

      {/* HERO — high contrast, readable */}
      <section className="bg-ink text-paper">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <h1 className="text-4xl font-black tracking-tight md:text-5xl">
            Mini Sticks. <span className="text-volt">Major Bragging Rights.</span>
          </h1>
          <p className="mt-4 max-w-2xl text-paper/70">
            Club colors for the big St. Louis programs, plus our Fun Series
            designs. $27.99 each. Grab one that&apos;s in stock for pickup now,
            or pre-order into the next monthly batch. Tap any stick to see it.
          </p>
        </div>
      </section>

      {/* CLUB STICKS */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-black tracking-tight">Club Sticks</h2>
            <p className="mt-1 text-black/60">
              One mini per club, in your colors.
            </p>
          </div>
          <Link
            href="/clubs"
            className="hidden shrink-0 text-sm font-bold text-black/50 hover:text-ink sm:block"
          >
            Don&apos;t see your club? →
          </Link>
        </div>

        {clubs.length > 0 ? (
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {clubs.map((item) => (
              <MiniCard key={item.slug} item={item} stock={stockOf(item.slug)} />
            ))}
          </div>
        ) : (
          <p className="mt-6 text-black/50">Club minis coming soon.</p>
        )}
      </section>

      {/* FUN SERIES */}
      <section className="mx-auto max-w-6xl px-4 pb-12">
        <h2 className="text-2xl font-black tracking-tight">Fun Series</h2>
        <p className="mt-1 text-black/60">
          Our brand, loud and proud — the basement-hockey classics.
        </p>
        {fun.length > 0 ? (
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {fun.map((item) => (
              <MiniCard key={item.slug} item={item} stock={stockOf(item.slug)} />
            ))}
          </div>
        ) : (
          <p className="mt-6 text-black/50">Fun Series coming soon.</p>
        )}
      </section>

      {/* CLUB BULK-ORDER CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="rounded-2xl bg-ink p-8 text-paper">
          <h2 className="text-2xl font-black">
            Run a club?{" "}
            <span className="text-volt">Put your logo on a stick.</span>
          </h2>
          <p className="mt-2 max-w-xl text-paper/70">
            We design custom mini sticks for STL-area clubs — team-priced bulk
            orders delivered with the monthly batch. Order 20+ and we donate
            10% back to your team.
          </p>
          <Link
            href="/clubs"
            className="mt-5 inline-block rounded-full bg-volt px-6 py-3 font-bold text-ink hover:bg-volt-dark"
          >
            Start a Club Order →
          </Link>
        </div>
      </section>
    </>
  );
}
