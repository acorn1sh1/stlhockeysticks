import type { Metadata } from "next";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import BatchBanner from "@/components/BatchBanner";
import { CATALOG } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Mini Sticks — Club Custom & Fun Series",
  description:
    "Custom club mini sticks and fun-design mini sticks. The knee-hockey upgrade your basement deserves. Local STL pickup.",
};

export default function MiniSticksPage() {
  const minis = CATALOG.filter(
    (c) => c.category === "MINI_CLUB" || c.category === "MINI_FUN"
  );
  return (
    <>
      <BatchBanner />
      <section className="mx-auto max-w-6xl px-4 py-12">
        <h1 className="text-4xl font-black tracking-tight">Mini Sticks</h1>
        <p className="mt-2 max-w-2xl text-black/60">
          Two flavors: <strong>Club Custom</strong> — your local club&apos;s colors
          and logo — and the <strong>Fun Series</strong> with loud, wild designs.
          Perfect for knee hockey, team gifts, and tournament swag.
        </p>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {minis.map((item) => (
            <ProductCard key={item.slug} item={item} />
          ))}
        </div>
        <div className="mt-12 rounded-2xl bg-ink p-8 text-paper">
          <h2 className="text-2xl font-black">
            Run a club? <span className="text-volt">Put your logo on a stick.</span>
          </h2>
          <p className="mt-2 max-w-xl text-paper/70">
            We design custom mini sticks for STL-area clubs. Team-priced bulk
            orders, delivered with the monthly batch.
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
