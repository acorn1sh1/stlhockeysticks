import type { Metadata } from "next";
import BatchBanner from "@/components/BatchBanner";
import ClubInquiryForm from "@/components/ClubInquiryForm";

export const metadata: Metadata = {
  title: "Custom Sticks for Clubs, Schools & Teams",
  description:
    "Custom mini sticks in your club's colors and logo, or bulk full-size stick orders for the whole team — delivered with our monthly batch. 10% donated back on qualifying orders.",
};

export default function ClubsPage() {
  return (
    <>
      <BatchBanner />
      <section className="bg-ink text-paper">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h1 className="max-w-2xl text-4xl font-black tracking-tight md:text-5xl">
            Your Club. Your Colors.{" "}
            <span className="text-volt">Your Sticks.</span>
          </h1>
          <p className="mt-4 max-w-xl text-paper/70">
            We design and produce custom mini sticks for hockey clubs,
            schools, and teams anywhere — your colors, your logo, the works.
            Clubs run them as fundraisers and end-of-season gifts that
            actually get used.
          </p>
          <p className="mt-4 inline-block rounded-full bg-volt px-4 py-2 text-sm font-bold text-ink">
            Order 50+ custom mini sticks and we donate 10% back to your team.
          </p>
        </div>
      </section>

      {/* Team bulk full-size sticks — separate program from the custom-logo
          minis: standard pre-order builds (flex/curve/hand/color), no club
          logo, quoted through the inquiry form. */}
      <section className="border-b border-black/10 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <h2 className="text-2xl font-black">Outfitting the whole team? Bulk full-size sticks.</h2>
          <p className="mt-3 max-w-2xl text-sm text-black/60">
            Not a logo product — these are our regular pro-quality sticks in
            the builds your players already order: pick flex, curve, hand,
            color, and length per player from our standard pre-order options.
            One team order, delivered together with the monthly batch, local
            pickup, no shipping.
          </p>
          <p className="mt-4 inline-block rounded-full bg-ink px-4 py-2 text-sm font-bold text-volt">
            20+ full-size sticks and we donate 10% back to your team.
          </p>
          <p className="mt-3 text-sm text-black/60">
            Tell us rough headcount in the form below and we&apos;ll set up
            your team order.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-10 md:grid-cols-2">
          <div>
            <h2 className="text-2xl font-black">How club orders work</h2>
            <ol className="mt-5 space-y-4 text-sm">
              {[
                ["Tell us who you are", "Club, school, or team — name, what you're after (custom minis, bulk full sticks, or both). Drop it in the form and we'll reply within a couple days."],
                ["Custom minis get a free mockup", "Ordering minis? You get a free mockup of your custom wrap — revise until the club loves it. Bulk full sticks skip this step: players just pick from our standard builds."],
                ["Set a team order", "Bulk pricing tiers based on quantity. Most clubs run it as a pre-order through the club or our site."],
                ["Delivered with the monthly batch", "Sticks arrive with our next bulk order. Club pickup or coordinator handoff — zero shipping."],
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
              Fundraiser idea: clubs typically sell custom sticks at a healthy
              markup over team cost. Your stick, your margin.
            </div>
          </div>

          <div className="rounded-2xl border border-black/10 bg-white p-6">
            <h2 className="text-xl font-black">Start your custom order</h2>
            <ClubInquiryForm />
          </div>
        </div>
      </section>
    </>
  );
}
