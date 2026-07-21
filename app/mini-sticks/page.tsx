import type { Metadata } from "next";
import Link from "next/link";
import MiniCard from "@/components/MiniCard";
import BatchBanner from "@/components/BatchBanner";
import { getStockMap } from "@/lib/inventory";
import { getMergedCatalog } from "@/lib/products";
import { getActiveClubs } from "@/lib/options";
import { CLUB_STICK_SLUG } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mini Sticks — Pre-Order Now, Club Designs Coming Soon",
  description:
    "Mini sticks in our standard colors, on pre-order now for $26.99. Custom club designs coming soon — want your club, school, or team on a stick? Reach out.",
};

export default async function MiniSticksPage() {
  const [stockMap, catalog, activeClubs] = await Promise.all([
    getStockMap(),
    getMergedCatalog(),
    getActiveClubs(),
  ]);

  const plain = catalog.filter((c) => c.category === "MINI_PLAIN");
  const fun = catalog.filter((c) => c.category === "MINI_FUN");
  // Single custom club mini now carries a "choose your club" picker (fed by
  // the admin Clubs list) instead of one product per club. Prefer the
  // canonical slug; fall back to any MINI_CLUB product.
  const clubProduct =
    catalog.find((c) => c.slug === CLUB_STICK_SLUG) ??
    catalog.find((c) => c.category === "MINI_CLUB");
  const clubsReady = activeClubs.length > 0;
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
            The basement-hockey classic in our standard colors — $26.99, on
            pre-order now. Custom designs for St. Louis clubs are in the works.
            Want your club, school, or team on a stick? Reach out below.
          </p>
        </div>
      </section>

      {/* PLAIN MINIS — buyable now */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="text-2xl font-black tracking-tight">Pre-Order Now</h2>
        <p className="mt-1 text-black/60">
          Standard colors, built with the next monthly batch. Pick your color on
          the next page.
        </p>
        {plain.length > 0 ? (
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {plain.map((item) => (
              <MiniCard key={item.slug} item={item} stock={stockOf(item.slug)} />
            ))}
          </div>
        ) : (
          <p className="mt-6 text-black/50">Minis are between batches — check back soon.</p>
        )}
      </section>

      {/* CLUB STICKS — coming soon teasers + anything already sellable */}
      <section className="mx-auto max-w-6xl px-4 pb-12">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-black tracking-tight">
              Club Designs{" "}
              {!clubsReady && <span className="text-black/40">— Coming Soon</span>}
            </h2>
            <p className="mt-1 text-black/60">
              {clubsReady
                ? "Your club's colors on an 18\" knee-hockey legend — $34.99, pre-order now. Pick your club on the next page."
                : "One mini per club, in your colors — $34.99 when they land. Designs drop as clubs sign off."}
            </p>
          </div>
          <Link
            href="/clubs"
            className="hidden shrink-0 text-sm font-bold text-black/50 hover:text-ink sm:block"
          >
            Don&apos;t see your club? →
          </Link>
        </div>

        {clubProduct ? (
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <MiniCard
              // When clubs are ready the card is openable (detail page has the
              // club picker); otherwise it stays a coming-soon teaser.
              item={{ ...clubProduct, comingSoon: !clubsReady }}
              stock={stockOf(clubProduct.slug)}
            />
          </div>
        ) : (
          <p className="mt-6 text-black/50">
            First club designs are in the works — want yours in the lineup?{" "}
            <Link href="/clubs" className="font-bold text-ink underline">
              Reach out
            </Link>
            .
          </p>
        )}
      </section>

      {/* FUN SERIES */}
      {fun.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-12">
          <h2 className="text-2xl font-black tracking-tight">Fun Series</h2>
          <p className="mt-1 text-black/60">
            Our brand, loud and proud — the basement-hockey classics. $31.99 each.
          </p>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {fun.map((item) => (
              <MiniCard key={item.slug} item={item} stock={stockOf(item.slug)} />
            ))}
          </div>
        </section>
      )}

      {/* CUSTOM STICK INQUIRY CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="rounded-2xl bg-ink p-8 text-paper">
          <h2 className="text-2xl font-black">
            Club? School? Team?{" "}
            <span className="text-volt">Put your logo on a stick.</span>
          </h2>
          <p className="mt-2 max-w-xl text-paper/70">
            We design custom mini sticks for clubs, schools, and teams — your
            colors, your logo, delivered with the monthly batch. Tell us who you
            are and we&apos;ll send a free mockup. Order 50+ and we donate 10%
            back to your team.
          </p>
          <Link
            href="/clubs"
            className="mt-5 inline-block rounded-full bg-volt px-6 py-3 font-bold text-ink hover:bg-volt-dark"
          >
            Get Your Custom Stick →
          </Link>
        </div>
      </section>
    </>
  );
}
