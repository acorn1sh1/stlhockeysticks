import Link from "next/link";
import { fmtPrice, type CatalogItem } from "@/lib/catalog";
import StickPhoto from "@/components/StickPhoto";

// Browse-only card for the mini-sticks catalog. Deliberately has NO
// add-to-cart — the whole card links to /mini-sticks/[slug] where the
// shopper picks quantity and buys. Availability (in-stock vs pre-order)
// is shown as a clear pill; art is tinted from the DB-driven accent color.
//
// `stock` is the live on-hand count for IN_STOCK minis (item.inStock flag).
// When an IN_STOCK mini hits 0 it falls back to pre-order rather than going
// unbuyable. Pre-order minis (item.inStock undefined) never pass `stock`.
export default function MiniCard({
  item,
  stock,
}: {
  item: CatalogItem;
  stock?: number;
}) {
  const stocked = !!item.inStock; // catalog flag: IN_STOCK type
  const shipsNow = stocked && typeof stock === "number" && stock > 0;
  const accent = item.accent ?? "#18181b";
  const colorway = item.category === "MINI_FUN" ? "fun" : "club";

  return (
    <Link
      href={`/mini-sticks/${item.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-black/10 bg-white transition hover:-translate-y-0.5 hover:shadow-xl"
    >
      <div
        className="relative flex h-44 items-center justify-center"
        style={{
          background: `linear-gradient(135deg, ${accent} 0%, ${accent}cc 55%, #0a0a0a 100%)`,
        }}
      >
        <StickPhoto colorway={colorway} className="h-40 w-full drop-shadow-lg" />
        <span
          className={`absolute right-3 top-3 rounded-full px-3 py-1 text-xs font-bold ${
            shipsNow ? "bg-volt text-ink" : "bg-white/95 text-ink"
          }`}
        >
          {shipsNow ? "In Stock" : "Pre-order"}
        </span>
        {item.badge && (
          <span className="absolute left-3 top-3 rounded-full bg-ink px-3 py-1 text-xs font-bold text-volt">
            {item.badge}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-lg font-bold text-ink">{item.name}</h3>
        <p className="mt-1 line-clamp-2 text-sm text-black/60">{item.description}</p>
        <div className="mt-4 flex flex-1 items-end justify-between">
          <span className="text-xl font-black text-ink">{fmtPrice(item.priceCents)}</span>
          <span className="text-sm font-bold text-black/50 transition group-hover:text-ink">
            View →
          </span>
        </div>
      </div>
    </Link>
  );
}
