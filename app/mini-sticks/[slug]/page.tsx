import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import BatchBanner from "@/components/BatchBanner";
import MiniBuyBox from "@/components/MiniBuyBox";
import StickPhoto from "@/components/StickPhoto";
import { getMergedItem } from "@/lib/products";
import { getStockMap } from "@/lib/inventory";
import { getStandardColors } from "@/lib/options";

export const dynamic = "force-dynamic";

const MINI_CATEGORIES = new Set(["MINI_PLAIN", "MINI_CLUB", "MINI_FUN"]);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const item = await getMergedItem(slug);
  return { title: item?.name ?? "Mini Stick", description: item?.description };
}

export default async function MiniStickDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [item, stockMap] = await Promise.all([
    getMergedItem(slug),
    getStockMap(),
  ]);
  // Only mini products live here; full sticks use /sticks/[slug].
  // Coming-soon teasers aren't openable (cards don't link here anyway).
  if (!item || !MINI_CATEGORIES.has(item.category) || item.comingSoon) notFound();

  // Plain minis: shopper picks one of the standard colors (admin-editable
  // COLOR rows). Club/Fun minis have a fixed design — no picker.
  const colors =
    item.category === "MINI_PLAIN" ? await getStandardColors(item.category) : [];

  const stock = stockMap[slug]?.inStock;
  const accent = item.accent ?? "#18181b";
  const colorway = item.category === "MINI_FUN" ? "fun" : "club";

  return (
    <>
      <BatchBanner />
      <div className="mx-auto max-w-6xl px-4 py-10">
        <Link
          href="/mini-sticks"
          className="text-sm font-bold text-black/50 hover:text-ink"
        >
          ← All mini sticks
        </Link>

        <div className="mt-4 grid gap-10 md:grid-cols-2">
          <div>
            <div
              className="flex h-72 items-center justify-center rounded-2xl"
              style={{
                background: `linear-gradient(135deg, ${accent} 0%, ${accent}cc 55%, #0a0a0a 100%)`,
              }}
            >
              <StickPhoto
                colorway={colorway}
                rotate={-12}
                className="h-64 w-full drop-shadow-xl"
              />
            </div>
            <h1 className="mt-6 text-3xl font-black tracking-tight">{item.name}</h1>
            <p className="mt-2 text-black/60">{item.description}</p>
            {item.specs && item.specs.length > 0 && (
              <ul className="mt-4 space-y-1 text-sm text-black/70">
                {item.specs.map((s) => (
                  <li key={s} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-volt-dark" /> {s}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex flex-col gap-4">
            <MiniBuyBox item={item} stock={stock} colors={colors} />
            <div className="rounded-2xl border border-black/10 bg-white p-6 text-sm text-black/60">
              <p className="font-bold text-ink">Local pickup only</p>
              <p className="mt-1">
                No shipping — pick up in the St. Louis area. Pre-orders come in
                with our next monthly batch; we&apos;ll email you when yours is
                ready.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
