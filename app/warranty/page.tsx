import type { Metadata } from "next";
import WarrantyForm from "@/components/WarrantyForm";

export const metadata: Metadata = {
  title: "Warranty Claim — Broken Stick",
  description:
    "File a warranty claim for a broken hockey stick within 30 days of purchase. Submit photos and your order number online.",
};

export default function WarrantyPage() {
  return (
    <>
      <section className="bg-ink text-paper">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <h1 className="max-w-2xl text-4xl font-black tracking-tight md:text-5xl">
            Broke a stick? <span className="text-volt">We&apos;ve got you.</span>
          </h1>
          <p className="mt-4 max-w-xl text-paper/70">
            Manufacturing defects and breakage are covered for 30 days from
            purchase. File your claim online with a couple photos and your order
            number — we&apos;ll sort out a replacement or refund.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-10 md:grid-cols-2">
          <div>
            <h2 className="text-2xl font-black">What&apos;s covered</h2>
            <ul className="mt-5 space-y-3 text-sm text-black/70">
              <li className="flex gap-3">
                <span className="font-black text-volt-dark">✓</span>
                <span>Sticks that break or fail within <strong>30 days of purchase</strong>.</span>
              </li>
              <li className="flex gap-3">
                <span className="font-black text-volt-dark">✓</span>
                <span>Manufacturing defects — delamination, cracked shafts, blade separation.</span>
              </li>
              <li className="flex gap-3">
                <span className="font-black text-volt-dark">✓</span>
                <span>Replacement from batch stock or a refund, our call based on the photos.</span>
              </li>
            </ul>

            <h2 className="mt-8 text-2xl font-black">What you&apos;ll need</h2>
            <ol className="mt-5 space-y-4 text-sm">
              {[
                ["Your order number", "It's in your order confirmation email. We verify every claim against the original order."],
                ["Photos of the break", "Clear shots of the damage — required. Up to 5 images (JPG, PNG, WEBP, or HEIC)."],
                ["A quick description", "How it broke and when you noticed. The more detail, the faster we can approve."],
              ].map(([t, d], i) => (
                <li key={t} className="flex gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-black text-volt">
                    {i + 1}
                  </span>
                  <div>
                    <div className="font-bold">{t}</div>
                    <div className="text-black/60">{d}</div>
                  </div>
                </li>
              ))}
            </ol>

            <div className="mt-8 rounded-2xl border border-black/10 bg-white p-5 text-sm text-black/60">
              Outside the 30-day window, or bought in bulk through a club? Email
              us anyway — we&apos;ll do what we can.
            </div>
          </div>

          <div className="rounded-2xl border border-black/10 bg-white p-6">
            <h2 className="text-xl font-black">File a warranty claim</h2>
            <WarrantyForm />
          </div>
        </div>
      </section>
    </>
  );
}
