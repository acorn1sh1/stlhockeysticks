import type { Metadata } from "next";
import ContactForm from "@/components/ContactForm";

export const metadata: Metadata = {
  title: "Contact Us — STL Hockey Sticks",
  description:
    "Questions about an order, pickup, sizing, or club custom sticks? Reach the STL Hockey Sticks team.",
};

const CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "hello@stlhockeysticks.com";

export default function ContactPage() {
  return (
    <>
      <section className="bg-ink text-paper">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <h1 className="max-w-2xl text-4xl font-black tracking-tight md:text-5xl">
            Get in <span className="text-volt">touch.</span>
          </h1>
          <p className="mt-4 max-w-xl text-paper/70">
            Questions about an order, local pickup, sizing, or a club custom
            run? Send us a note and we&apos;ll get back to you.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-10 md:grid-cols-2">
          <div>
            <h2 className="text-2xl font-black">Ways to reach us</h2>
            <ul className="mt-5 space-y-4 text-sm text-black/70">
              <li className="flex gap-3">
                <span className="font-black text-volt-dark">Email</span>
                <a href={`mailto:${CONTACT_EMAIL}`} className="underline hover:text-volt-dark">
                  {CONTACT_EMAIL}
                </a>
              </li>
              <li className="flex gap-3">
                <span className="font-black text-volt-dark">Pickup</span>
                <span>
                  {process.env.NEXT_PUBLIC_PICKUP_ADDRESS ??
                    "St. Louis, MO — address sent with pickup confirmation"}
                </span>
              </li>
            </ul>

            <div className="mt-8 space-y-4 text-sm">
              <div className="rounded-2xl border border-black/10 bg-white p-5 text-black/70">
                <div className="font-bold text-black">Broke a stick?</div>
                File a warranty claim online — it&apos;s faster than email.{" "}
                <a href="/warranty" className="underline hover:text-volt-dark">
                  Start a warranty claim
                </a>
                .
              </div>
              <div className="rounded-2xl border border-black/10 bg-white p-5 text-black/70">
                <div className="font-bold text-black">Ordering for a club?</div>
                Custom team sticks have their own program.{" "}
                <a href="/clubs" className="underline hover:text-volt-dark">
                  See the club program
                </a>
                .
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-black/10 bg-white p-6">
            <h2 className="text-xl font-black">Send us a message</h2>
            <ContactForm />
          </div>
        </div>
      </section>
    </>
  );
}
