// Real customer testimonials. Add GENUINE quotes here as they come in (from
// Google reviews or customers who reply). The section renders nothing while the
// list is empty, so it's safe to ship before you have any — no fake filler.
//
// Once you have a handful of real reviews we can wire up Review + AggregateRating
// structured data so star ratings can show in Google results. Do NOT add rating
// markup for reviews you don't actually have — Google penalizes that.
type Testimonial = { quote: string; name: string; detail?: string };

const TESTIMONIALS: Testimonial[] = [
  // Example shape — delete this comment and add real ones:
  // { quote: "Same stick I paid $270 for at the pro shop — half the price and I picked it up 10 minutes from home.", name: "Mike R.", detail: "Senior 85 flex, P92" },
];

export default function Testimonials() {
  if (TESTIMONIALS.length === 0) return null;

  return (
    <section className="border-y border-black/10 bg-white/60">
      <div className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-center text-3xl font-black tracking-tight">
          What St. Louis Players Are Saying
        </h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <figure key={i} className="rounded-2xl border border-black/10 bg-white p-6">
              <div className="text-volt-dark" aria-hidden>
                {"★★★★★"}
              </div>
              <blockquote className="mt-3 text-sm text-black/70">
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <figcaption className="mt-4 text-sm font-bold">
                {t.name}
                {t.detail && (
                  <span className="ml-1 font-normal text-black/40">· {t.detail}</span>
                )}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
