import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import BatchBanner from "@/components/BatchBanner";
import Configurator from "@/components/Configurator";
import { CATALOG } from "@/lib/catalog";

export function generateStaticParams() {
  return CATALOG.filter((c) => c.options).map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const item = CATALOG.find((c) => c.slug === slug);
  return { title: item?.name ?? "Stick", description: item?.description };
}

export default async function StickDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const item = CATALOG.find((c) => c.slug === slug && c.options);
  if (!item) notFound();

  return (
    <>
      <BatchBanner />
      <div className="mx-auto max-w-6xl px-4 py-10">
        <Link href="/sticks" className="text-sm font-bold text-black/50 hover:text-ink">
          ← All sticks
        </Link>
        <div className="mt-4 grid gap-10 md:grid-cols-2">
          <div>
            <div className="flex h-72 items-center justify-center rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-600">
              <svg viewBox="0 0 200 60" className="h-24 w-56 opacity-90">
                <path
                  d="M10 8 L150 42 Q160 45 175 45 L192 45 Q196 45 196 49 L196 52 Q196 55 192 55 L170 55 Q152 55 140 51 L6 19 Q2 18 3 14 L4 11 Q5 7 10 8 Z"
                  fill="white"
                />
              </svg>
            </div>
            <h1 className="mt-6 text-3xl font-black tracking-tight">{item.name}</h1>
            <p className="mt-2 text-black/60">{item.description}</p>
            {item.specs && (
              <ul className="mt-4 space-y-1 text-sm text-black/70">
                {item.specs.map((s) => (
                  <li key={s} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-volt-dark" /> {s}
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-6 rounded-xl bg-volt/20 p-4 text-sm">
              <strong>Batch pre-order.</strong> Your build goes into the
              monthly factory order — lock it in before the cutoff, then pick
              up in STL when the batch lands. No shipping, no middleman markup.
            </div>
          </div>
          <div className="rounded-2xl border border-black/10 bg-white p-6">
            <h2 className="mb-5 text-xl font-black">Build your stick</h2>
            <Configurator item={item} />
          </div>
        </div>
      </div>
    </>
  );
}
