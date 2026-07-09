"use client";

import { useState } from "react";
import { fmtPrice, type CatalogItem } from "@/lib/catalog";
import { useCart } from "@/lib/cart";

// Client add-to-cart box for the mini stick detail page. Mirrors the
// availability rules used on the full-stick pages: an IN_STOCK mini with
// live stock ships now (quantity picker); otherwise it's a pre-order into
// the next monthly batch (single unit). Minis are non-configurable so
// `add` takes no options.
export default function MiniBuyBox({
  item,
  stock,
}: {
  item: CatalogItem;
  stock?: number;
}) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);
  const [qty, setQty] = useState(1);

  const stocked = !!item.inStock;
  const shipsNow = stocked && typeof stock === "number" && stock > 0;
  const lowStock = shipsNow && (stock as number) <= 5;

  const onAdd = () => {
    add(item, undefined, shipsNow ? qty : 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  };

  return (
    <div className="rounded-2xl border border-black/10 bg-white p-6">
      <div className="flex items-center justify-between">
        <span className="text-2xl font-black text-ink">{fmtPrice(item.priceCents)}</span>
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ${
            shipsNow ? "bg-volt text-ink" : "bg-ink text-volt"
          }`}
        >
          {shipsNow ? "In Stock — Pick Up Now" : "Pre-order — Next Batch"}
        </span>
      </div>

      <p className="mt-3 text-sm text-black/60">
        {shipsNow
          ? "On hand now. Local St. Louis pickup — no shipping."
          : "Reserve yours now and it's built with our next monthly batch. Local pickup when it lands."}
      </p>
      {lowStock && (
        <p className="mt-2 text-sm font-bold text-ink">Only {stock} left.</p>
      )}

      <div className="mt-5 flex items-center gap-3">
        {shipsNow && (
          <div className="flex items-center gap-1">
            <button
              aria-label="Decrease quantity"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="h-9 w-9 shrink-0 rounded-full border border-black/20 font-bold hover:bg-black/5"
            >
              −
            </button>
            <span className="w-6 text-center font-bold">{qty}</span>
            <button
              aria-label="Increase quantity"
              onClick={() => setQty((q) => q + 1)}
              className="h-9 w-9 shrink-0 rounded-full border border-black/20 font-bold hover:bg-black/5"
            >
              +
            </button>
          </div>
        )}
        <button
          onClick={onAdd}
          className={`flex-1 rounded-full px-6 py-3 font-bold transition ${
            added ? "bg-volt text-ink" : "bg-ink text-paper hover:bg-ink/80"
          }`}
        >
          {added ? "Added ✓" : shipsNow ? "Add to Cart" : "Pre-order"}
        </button>
      </div>
    </div>
  );
}
