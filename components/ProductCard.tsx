"use client";

import Link from "next/link";
import { fmtPrice, type CatalogItem } from "@/lib/catalog";
import { useCart } from "@/lib/cart";
import { useState } from "react";

const art: Record<CatalogItem["category"], string> = {
  FULL_STICK: "from-zinc-800 to-zinc-600",
  GOALIE: "from-emerald-900 to-emerald-600",
  MINI_CLUB: "from-blue-900 to-blue-600",
  MINI_FUN: "from-fuchsia-700 to-orange-500",
};

export default function ProductCard({ item }: { item: CatalogItem }) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);
  const configurable = !!item.options;

  const onAdd = () => {
    add(item);
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  };

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-black/10 bg-white transition hover:shadow-xl">
      <div
        className={`relative flex h-44 items-center justify-center bg-gradient-to-br ${art[item.category]}`}
      >
        <svg viewBox="0 0 200 60" className="h-16 w-40 opacity-90">
          <path
            d="M10 8 L150 42 Q160 45 175 45 L192 45 Q196 45 196 49 L196 52 Q196 55 192 55 L170 55 Q152 55 140 51 L6 19 Q2 18 3 14 L4 11 Q5 7 10 8 Z"
            fill="white"
          />
        </svg>
        {item.badge && (
          <span className="absolute left-3 top-3 rounded-full bg-volt px-3 py-1 text-xs font-bold text-ink">
            {item.badge}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-lg font-bold">{item.name}</h3>
        <p className="mt-1 text-sm text-black/60">{item.description}</p>
        {item.specs && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {item.specs.map((s) => (
              <span
                key={s}
                className="rounded-full bg-black/5 px-2.5 py-0.5 text-xs font-semibold text-black/60"
              >
                {s}
              </span>
            ))}
          </div>
        )}
        <div className="mt-4 flex flex-1 items-end justify-between">
          <span className="text-xl font-black">{fmtPrice(item.priceCents)}</span>
          {configurable ? (
            <Link
              href={`/sticks/${item.slug}`}
              className="rounded-full bg-ink px-5 py-2 text-sm font-bold text-paper transition hover:bg-ink/80"
            >
              Customize →
            </Link>
          ) : (
            <button
              onClick={onAdd}
              className={`rounded-full px-5 py-2 text-sm font-bold transition ${
                added ? "bg-volt text-ink" : "bg-ink text-paper hover:bg-ink/80"
              }`}
            >
              {added ? "Added ✓" : "Add to Cart"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
