"use client";

import Link from "next/link";
import { fmtPrice, type CatalogItem } from "@/lib/catalog";
import { useCart } from "@/lib/cart";
import { useState } from "react";
import StickPhoto from "@/components/StickPhoto";

const art: Record<CatalogItem["category"], string> = {
  FULL_STICK: "from-zinc-800 to-zinc-600",
  GOALIE: "from-emerald-900 to-emerald-600",
  MINI_CLUB: "from-blue-900 to-blue-600",
  MINI_FUN: "from-fuchsia-700 to-orange-500",
};

const stickColor: Record<
  CatalogItem["category"],
  "carbon" | "goalie" | "club" | "fun"
> = {
  FULL_STICK: "carbon",
  GOALIE: "goalie",
  MINI_CLUB: "club",
  MINI_FUN: "fun",
};

// `stock` is the live on-hand count for physically-stocked SKUs
// (items with catalog flag `inStock: true`). Omit for built-to-order
// / pre-order products. When a stocked SKU hits 0 it falls back to
// pre-order into the next batch rather than going unbuyable.
export default function ProductCard({
  item,
  stock,
}: {
  item: CatalogItem;
  stock?: number;
}) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);
  const [qty, setQty] = useState(1);
  const configurable = !!item.options;

  const stocked = !!item.inStock; // catalog flag: carries live inventory
  const shipsNow = stocked && typeof stock === "number" && stock > 0;
  const preorderFallback = stocked && !shipsNow;
  const lowStock = shipsNow && (stock as number) <= 5;
  // Configurable builds (Senior/Int/Jr/Youth/Goalie tiers) always carry no
  // live inventory — they're built to order every batch. Flag this
  // explicitly so the full /sticks page never reads as "in stock" by
  // default; the top-left badge is reserved for the quality tier (Top
  // Shelf / Best Seller / Best Value).
  const buildToOrder = configurable && !stocked;

  // Ships-now items can be bought in multiples; pre-order fallback keeps it simple.
  const canPickQty = shipsNow;
  const badge = preorderFallback ? "Pre-order — Next Batch" : item.badge;

  const onAdd = () => {
    add(item, undefined, canPickQty ? qty : 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  };

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-black/10 bg-white transition hover:shadow-xl">
      <div
        className={`relative flex h-44 items-center justify-center bg-gradient-to-br ${art[item.category]}`}
      >
        <StickPhoto
          colorway={stickColor[item.category]}
          className="h-40 w-full drop-shadow-lg"
        />
        {badge && (
          <span
            className={`absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-bold ${
              preorderFallback ? "bg-ink text-volt" : "bg-volt text-ink"
            }`}
          >
            {badge}
          </span>
        )}
        {lowStock && (
          <span className="absolute right-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-ink">
            Only {stock} left
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
        {preorderFallback && (
          <p className="mt-3 text-xs font-semibold text-black/50">
            Out of on-hand stock — order now and it ships with the next monthly batch.
          </p>
        )}
        {buildToOrder && (
          <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-black/50">
            <span className="rounded-full bg-black/5 px-2 py-0.5 font-bold text-black/60">
              Pre-order
            </span>
            Built to order — ships with the next monthly batch.
          </p>
        )}
        <div className="mt-4 flex flex-1 flex-col justify-end gap-3">
          <span className="text-xl font-black">{fmtPrice(item.priceCents)}</span>
          {configurable ? (
            <Link
              href={`/sticks/${item.slug}`}
              className="self-start rounded-full bg-ink px-5 py-2 text-sm font-bold text-paper transition hover:bg-ink/80"
            >
              Customize →
            </Link>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2">
              {canPickQty && (
                <div className="flex items-center gap-1">
                  <button
                    aria-label="Decrease quantity"
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    className="h-8 w-8 shrink-0 rounded-full border border-black/20 font-bold hover:bg-black/5"
                  >
                    −
                  </button>
                  <span className="w-5 text-center font-bold">{qty}</span>
                  <button
                    aria-label="Increase quantity"
                    onClick={() => setQty((q) => q + 1)}
                    className="h-8 w-8 shrink-0 rounded-full border border-black/20 font-bold hover:bg-black/5"
                  >
                    +
                  </button>
                </div>
              )}
              <button
                onClick={onAdd}
                className={`shrink-0 whitespace-nowrap rounded-full px-5 py-2 text-sm font-bold transition ${
                  added ? "bg-volt text-ink" : "bg-ink text-paper hover:bg-ink/80"
                }`}
              >
                {added ? "Added ✓" : preorderFallback ? "Pre-order" : "Add to Cart"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
