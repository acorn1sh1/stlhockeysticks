import type { Metadata } from "next";
import Link from "next/link";
import BatchBanner from "@/components/BatchBanner";

export const metadata: Metadata = {
  title: "How It Works — Monthly Batches, Local Pickup",
  description:
    "How our monthly bulk ordering and free local St. Louis pickup keeps hockey stick prices low.",
};

const faqs = [
  {
    q: "Why are your sticks cheaper?",
    a: "Three reasons: we buy factory-direct by the pallet, we don't run a retail storefront, and you pick up locally so nobody pays oversized-item shipping. Same T1100/T800 carbon construction, way less overhead.",
  },
  {
    q: "When do I get my sticks?",
    a: "Pre-orders lock on the 1st of each month. The batch takes about a month to manufacture, then roughly 2 weeks to ship to St. Louis — about 6 weeks total. We email you the second your order's ready for pickup. Need something sooner? Check the In Stock lineup — those ship with no batch wait.",
  },
  {
    q: "Where is pickup?",
    a: "St. Louis metro. The exact address and pickup window are emailed with your ready-for-pickup confirmation.",
  },
  {
    q: "What if a stick is defective or breaks?",
    a: "Every stick is covered for 30 days from purchase. If one breaks or fails, file a claim on our Warranty page with your order number and photos of the break plus the manufacturing info on the shaft. Approved claims get a replacement stick — from stock if we have it, otherwise on the next batch. We don't issue refunds. No hassle, no interrogation.",
  },
  {
    q: "Do I need an account?",
    a: "No — guest checkout works fine. An account just makes it easier to track your order history.",
  },
  {
    q: "How do payments work?",
    a: "Checkout is powered by Clover. Your card details never touch our servers.",
  },
];

export default function HowItWorks() {
  return (
    <>
      <BatchBanner />
      <section className="mx-auto max-w-4xl px-4 py-12">
        <h1 className="text-4xl font-black tracking-tight">How It Works</h1>

        <ol className="mt-8 space-y-6">
          {[
            ["Order online", "Add sticks to your cart and check out securely with Clover. In-stock items are ready now; pre-order items join the current monthly batch."],
            ["We place one big order", "On the 1st of each month, all pre-orders combine into a single bulk factory order. That volume is what gets you wholesale pricing."],
            ["Sticks get built", "Manufacturing takes about a month — real construction, not a rush job."],
            ["The batch lands in STL", "Roughly 2 weeks after that, the shipment arrives. We inspect every stick before it goes out."],
            ["You pick up locally", "We email your pickup window. Swing by, grab your sticks, save the shipping money."],
          ].map(([t, d], i) => (
            <li key={t} className="flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink font-black text-volt">
                {i + 1}
              </div>
              <div>
                <h3 className="font-bold">{t}</h3>
                <p className="mt-1 text-sm text-black/60">{d}</p>
              </div>
            </li>
          ))}
        </ol>

        <h2 className="mt-14 text-2xl font-black">FAQ</h2>
        <div className="mt-4 divide-y divide-black/10">
          {faqs.map((f) => (
            <details key={f.q} className="group py-4">
              <summary className="cursor-pointer list-none font-bold marker:hidden">
                {f.q}
              </summary>
              <p className="mt-2 text-sm text-black/60">{f.a}</p>
            </details>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link
            href="/sticks"
            className="inline-block rounded-full bg-ink px-7 py-3 font-bold text-paper hover:bg-ink/80"
          >
            Shop the Current Batch →
          </Link>
        </div>
      </section>
    </>
  );
}
