import Link from "next/link";
import BatchBanner from "@/components/BatchBanner";
import ProductCard from "@/components/ProductCard";
import MiniCard from "@/components/MiniCard";
import StickPhoto from "@/components/StickPhoto";
import { fmtPrice } from "@/lib/catalog";
import { getStockMap } from "@/lib/inventory";
import { getMergedCatalog } from "@/lib/products";
import { SIZE_TIERS as SIZE_GROUPS } from "@/lib/sizeTiers";

export const dynamic = "force-dynamic";

// Size groups drive the "Shop by Size" grid. Each links into its own
// dedicated /sticks/[tier] page (not an anchor on the combined page) —
// clicking "Senior" should only show senior builds, not the whole catalog.
// "from" price = cheapest build in the size.

export default async function Home() {
  const [stockMap, catalog] = await Promise.all([
    getStockMap(),
    getMergedCatalog(),
  ]);
  const configurable = catalog.filter((c) => c.options);
  const minis = catalog.filter(
    (c) => c.category === "MINI_CLUB" || c.category === "MINI_FUN"
  );
  const inStock = catalog.filter((c) => c.inStock);

  const sizes = SIZE_GROUPS.map((g) => {
    const items = configurable.filter(g.match);
    const fromCents = items.length ? Math.min(...items.map((i) => i.priceCents)) : 0;
    return { ...g, fromCents, count: items.length };
  }).filter((g) => g.count > 0);

  return (
    <>
      <BatchBanner />

      {/* HERO */}
      <section className="bg-ink text-paper">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-20 md:grid-cols-2 md:py-28">
          <div>
            <h1 className="text-5xl font-black leading-[1.05] tracking-tight md:text-6xl">
              PRO STICKS.
              <br />
              <span className="text-volt">STL PRICES.</span>
              <br />
              ZERO SHIPPING.
            </h1>
            <p className="mt-6 max-w-md text-lg text-paper/70">
              Composite twigs for every player on the roster — senior to youth,
              plus goalie — bought by the pallet and picked up right here in St.
              Louis. No distributor markup, no oversized-box shipping tax.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/sticks"
                className="rounded-full bg-volt px-7 py-3 font-bold text-ink transition hover:bg-volt-dark"
              >
                Shop Full Sticks
              </Link>
              <Link
                href="/sticks/in-stock"
                className="rounded-full border border-paper/30 px-7 py-3 font-bold transition hover:border-volt hover:text-volt"
              >
                Pick Up Now →
              </Link>
            </div>
          </div>
          <div className="relative hidden items-center justify-center md:flex">
            <div className="absolute h-72 w-72 rounded-full border-2 border-volt/30" />
            <StickPhoto colorway="carbon" rotate={-10} className="relative h-96 w-full" />
          </div>
        </div>
      </section>

      {/* FIRST-BATCH LAUNCH OFFER */}
      <section className="border-b border-volt/30 bg-ink text-paper">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <div className="mb-8 text-center">
            <span className="inline-block rounded-full bg-volt px-4 py-1 text-xs font-black uppercase tracking-wide text-ink">
              First Batch — Order by Aug 1
            </span>
            <h2 className="mt-4 text-3xl font-black tracking-tight md:text-4xl">
              Stack the Batch. <span className="text-volt">Stack the Savings.</span>
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-paper/70">
              We&apos;re filling our very first factory order. Go in with your
              linemates, gear up the whole squad, or just grab a backup twig —
              the more sticks in the batch, the deeper the discount. Lock your
              order by <strong className="text-paper">August 1</strong> to cash in.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            {[
              { qty: "2+", pct: "10%", label: "You & a linemate" },
              { qty: "5+", pct: "20%", label: "Half the bench" },
              { qty: "10+", pct: "25%", label: "Whole roster" },
            ].map((t) => (
              <div
                key={t.qty}
                className="rounded-2xl border border-paper/15 bg-paper/5 p-6 text-center"
              >
                <div className="text-sm font-bold text-paper/60">Buy {t.qty} sticks</div>
                <div className="mt-1 text-5xl font-black text-volt">{t.pct}</div>
                <div className="mt-1 text-sm font-bold uppercase tracking-wide text-paper/70">
                  off
                </div>
                <div className="mt-3 text-sm text-paper/60">{t.label}</div>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link
              href="/sticks"
              className="inline-block rounded-full bg-volt px-8 py-3 font-bold text-ink transition hover:bg-volt-dark"
            >
              Build Your Batch Order →
            </Link>
            <p className="mt-3 text-xs text-paper/50">
              Discount applies automatically in your cart — no code needed. Full
              &amp; goalie sticks, mix any sizes. Ends August 1.
            </p>
          </div>
        </div>
      </section>

      {/* SHOP BY SIZE */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-3xl font-black tracking-tight">Shop by Size</h2>
              <span className="rounded-full bg-ink px-3 py-1 text-xs font-bold text-volt">
                Pre-order — Next Batch
              </span>
            </div>
            <p className="mt-1 text-sm text-black/50">
              Every size comes in three builds — Elite, Performance, and Value.
              Pick your player, then dial in flex, curve, and color. These are
              built to order — reserve now and pick up with the next monthly
              batch.
            </p>
          </div>
          <Link href="/sticks" className="text-sm font-bold text-volt-dark hover:underline">
            View all builds →
          </Link>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {sizes.map((s) => (
            <Link
              key={s.key}
              href={`/sticks/${s.key}`}
              className="group flex flex-col justify-between rounded-2xl border border-black/10 bg-white p-5 transition hover:border-volt hover:shadow-xl"
            >
              <div>
                <div className="flex h-20 items-center justify-center">
                  <StickPhoto
                    colorway="carbon"
                    className="h-20 w-full transition group-hover:scale-105"
                  />
                </div>
                <h3 className="text-lg font-black">{s.label}</h3>
                <p className="mt-0.5 text-xs font-semibold text-black/50">{s.tag}</p>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm font-bold text-black/70">
                  from {fmtPrice(s.fromCents)}
                </span>
                <span className="text-sm font-black text-volt-dark transition group-hover:translate-x-0.5">
                  →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* IN STOCK — PICK UP NOW (live) */}
      {inStock.length > 0 && (
        <section className="border-y border-black/10 bg-white/60">
          <div className="mx-auto max-w-6xl px-4 py-14">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="text-3xl font-black tracking-tight">
                  On the Shelf <span className="text-volt-dark">— Pick Up Now</span>
                </h2>
                <p className="mt-1 text-sm text-black/50">
                  Built and in hand today. No batch wait — grab it and go.
                </p>
              </div>
              <Link href="/sticks/in-stock" className="text-sm font-bold text-volt-dark hover:underline">
                See all in-stock →
              </Link>
            </div>
            <div className="grid gap-6 md:grid-cols-4">
              {inStock.map((item) => (
                <ProductCard
                  key={item.slug}
                  item={item}
                  stock={stockMap[item.slug]?.inStock ?? 0}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* VALUE PROPS */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              t: "Wholesale, Not Retail",
              d: "We order factory-direct, by the pallet. You pay a fraction of pro-shop sticker price for the same T1100/T800 carbon builds.",
            },
            {
              t: "Every Size, Three Tiers",
              d: "Senior down to youth, plus goalie — each in Elite, Performance, and Value builds. Snipe like the powerplay or grab a bender-proof backup.",
            },
            {
              t: "Local Pickup Only",
              d: "No $25 oversized-item shipping fee. Swing by our STL pickup spot, grab your sticks, put that money toward tape instead.",
            },
          ].map((v) => (
            <div key={v.t} className="rounded-2xl border border-black/10 bg-white p-6">
              <h3 className="text-lg font-black">{v.t}</h3>
              <p className="mt-2 text-sm text-black/60">{v.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* MINI STICKS PITCH */}
      <section className="bg-ink py-16 text-paper">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-8 max-w-2xl">
            <h2 className="text-3xl font-black tracking-tight">
              Mini Sticks. <span className="text-volt">Major Bragging Rights.</span>
            </h2>
            <p className="mt-3 text-paper/70">
              Custom mini sticks in your club&apos;s colors — or wild Fun Series
              graphics for the basement-hockey diehards. $27.99, every
              design, the best money you&apos;ll spend on team spirit and
              carpet slap shots.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {minis.slice(0, 3).map((item) => (
              <MiniCard
                key={item.slug}
                item={item}
                stock={stockMap[item.slug]?.inStock}
              />
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link
              href="/mini-sticks"
              className="inline-block rounded-full bg-volt px-7 py-3 font-bold text-ink transition hover:bg-volt-dark"
            >
              Browse All Mini Sticks →
            </Link>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-center text-3xl font-black tracking-tight">
          How It Works
        </h2>
        <div className="mt-10 grid gap-8 md:grid-cols-4">
          {[
            ["1", "Order Online", "Pick your flex, curve, and colorway. Check out securely with Clover."],
            ["2", "We Bulk-Buy", "Orders lock on the 1st. We place one big factory order — that's where the wholesale pricing comes from."],
            ["3", "Sticks Land in STL", "About a month to build, then ~2 weeks to ship — your batch rolls into St. Louis roughly 6 weeks after cutoff."],
            ["4", "You Pick Up", "Swing by, grab your twigs, head straight to open ice. Zero shipping, zero hassle."],
          ].map(([n, t, d]) => (
            <div key={n} className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-ink font-black text-volt">
                {n}
              </div>
              <h3 className="mt-3 font-bold">{t}</h3>
              <p className="mt-1 text-sm text-black/60">{d}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
