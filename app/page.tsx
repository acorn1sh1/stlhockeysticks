import Link from "next/link";
import BatchBanner from "@/components/BatchBanner";
import ProductCard from "@/components/ProductCard";
import { CATALOG } from "@/lib/catalog";

export default function Home() {
  const featured = CATALOG.slice(0, 3);
  const minis = CATALOG.filter(
    (c) => c.category === "MINI_CLUB" || c.category === "MINI_FUN"
  );

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
              We buy composite sticks in bulk once a month and you pick them up
              right here in St. Louis. Cut out the shipping, cut out the
              middleman — keep the savings.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/sticks"
                className="rounded-full bg-volt px-7 py-3 font-bold text-ink transition hover:bg-volt-dark"
              >
                Shop Full Sticks
              </Link>
              <Link
                href="/mini-sticks"
                className="rounded-full border border-paper/30 px-7 py-3 font-bold transition hover:border-volt hover:text-volt"
              >
                Shop Mini Sticks
              </Link>
            </div>
          </div>
          <div className="hidden justify-center md:flex">
            <svg viewBox="0 0 300 300" className="h-80 w-80">
              <circle cx="150" cy="150" r="140" fill="none" stroke="#b8e62e" strokeWidth="2" opacity="0.3" />
              <path
                d="M60 40 L200 240 Q206 249 218 252 L252 260 Q260 262 258 270 L256 276 Q254 284 246 282 L208 273 Q190 269 180 255 L44 52 Q40 46 46 41 L50 38 Q56 34 60 40 Z"
                fill="#fafafa"
              />
              <path d="M60 40 L110 112 L96 122 L44 52 Q40 46 46 41 L50 38 Q56 34 60 40 Z" fill="#b8e62e" />
            </svg>
          </div>
        </div>
      </section>

      {/* VALUE PROPS */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              t: "Wholesale, Not Retail",
              d: "We order factory-direct in bulk. You pay a fraction of pro-shop prices for comparable composite construction.",
            },
            {
              t: "Monthly Batch Drops",
              d: "Orders lock on the 1st of each month. Sticks land in St. Louis about two weeks later, ready for pickup.",
            },
            {
              t: "Local Pickup Only",
              d: "No $25 oversized-item shipping. Grab your sticks at our STL pickup spot and put that money toward tape.",
            },
          ].map((v) => (
            <div key={v.t} className="rounded-2xl border border-black/10 bg-white p-6">
              <h3 className="text-lg font-black">{v.t}</h3>
              <p className="mt-2 text-sm text-black/60">{v.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURED FULL STICKS */}
      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="text-3xl font-black tracking-tight">Full Sticks</h2>
          <Link href="/sticks" className="text-sm font-bold text-volt-dark hover:underline">
            View all →
          </Link>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {featured.map((item) => (
            <ProductCard key={item.slug} item={item} />
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
              designs for the basement league. The best $15–$20 you&apos;ll spend
              on team spirit.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {minis.map((item) => (
              <ProductCard key={item.slug} item={item} />
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link
              href="/clubs"
              className="inline-block rounded-full bg-volt px-7 py-3 font-bold text-ink transition hover:bg-volt-dark"
            >
              Get Your Club&apos;s Custom Stick →
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
            ["1", "Order Online", "Pick your sticks, check out securely with Clover."],
            ["2", "We Bulk-Buy", "Orders lock on the 1st. We place one big factory order."],
            ["3", "Sticks Land in STL", "About two weeks later, your order arrives."],
            ["4", "You Pick Up", "Grab your sticks locally. Zero shipping cost."],
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
