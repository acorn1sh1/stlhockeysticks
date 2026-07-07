import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import BatchBanner from "@/components/BatchBanner";
import Configurator from "@/components/Configurator";
import StickPhoto from "@/components/StickPhoto";
import { CATALOG } from "@/lib/catalog";
import { getMergedItem } from "@/lib/products";

export const dynamic = "force-dynamic";

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
  const item = await getMergedItem(slug);
  if (!item?.options) notFound();

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
              <StickPhoto
                colorway={item.category === "GOALIE" ? "goalie" : "carbon"}
                rotate={-12}
                className="h-64 w-full drop-shadow-xl"
              />
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
