import type { Metadata } from "next";
import ProductCard from "@/components/ProductCard";
import BatchBanner from "@/components/BatchBanner";
import { CATALOG } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Full-Size Composite Sticks",
  description:
    "Senior, intermediate, junior, youth, and goalie composite hockey sticks at wholesale prices. Custom flex, curve, color, and name. Local St. Louis pickup.",
};

export default function SticksPage() {
  const senior = CATALOG.filter((c) => c.slug.includes("senior"));
  const sized = CATALOG.filter((c) =>
    ["intermediate-stick", "junior-stick", "youth-stick"].includes(c.slug)
  );
  const goalie = CATALOG.filter((c) => c.category === "GOALIE");

  return (
    <>
      <BatchBanner />
      <section className="mx-auto max-w-6xl px-4 py-12">
        <h1 className="text-4xl font-black tracking-tight">Full-Size Sticks</h1>
        <p className="mt-2 max-w-2xl text-black/60">
          Every stick is built to order: pick your flex, curve, hand, color —
          even get your name printed on the shaft. Pre-order into this
          month&apos;s batch, pick up in STL.
        </p>

        <h2 className="mt-10 text-2xl font-black">Senior — pick your build</h2>
        <div className="mt-4 grid gap-6 md:grid-cols-3">
          {senior.map((item) => (
            <ProductCard key={item.slug} item={item} />
          ))}
        </div>

        <h2 className="mt-12 text-2xl font-black">Intermediate · Junior · Youth</h2>
        <div className="mt-4 grid gap-6 md:grid-cols-3">
          {sized.map((item) => (
            <ProductCard key={item.slug} item={item} />
          ))}
        </div>

        <h2 className="mt-12 text-2xl font-black">Goalies</h2>
        <div className="mt-4 grid gap-6 md:grid-cols-3">
          {goalie.map((item) => (
            <ProductCard key={item.slug} item={item} />
          ))}
        </div>
      </section>
    </>
  );
}
