import type { Metadata } from "next";
import BatchBanner from "@/components/BatchBanner";
import ClubInquiryForm from "@/components/ClubInquiryForm";

export const metadata: Metadata = {
  title: "Custom Sticks for Clubs, Schools & Teams",
  description:
    "Custom sticks in your STL club's, school's, or team's colors and logo — full sticks, goalie sticks, minis, or any mix. Team-priced bulk orders delivered with our monthly batch.",
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
            We design and produce custom sticks for hockey clubs, schools, and
            teams anywhere — your colors, your logo, the works. Placing a
            full stick order for the whole team? We got you. Want to mix and
            match minis and goalie sticks? No problem. Clubs run them as
            fundraisers and end-of-season gifts that actually get used.
          </p>
          <p className="mt-4 inline-block rounded-full bg-volt px-4 py-2 text-sm font-bold text-ink">
            Order 50+ mini sticks — or 20+ full sticks — and we donate 10% back to your team.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-10 md:grid-cols-2">
          <div>
            <h2 className="text-2xl font-black">How club orders work</h2>
            <ol className="mt-5 space-y-4 text-sm">
              {[
                ["Tell us who you are", "Club, school, or team — name, colors, logo. Drop it in the form and we'll reply within a couple days."],
                ["We design your stick", "You get a free mockup of your custom wrap. Revise until the club loves it."],
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
