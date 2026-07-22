import { fmtPrice, optionsSummary, type SelectedOptions } from "@/lib/catalog";
import { prisma } from "@/lib/db";
import { lineOutstanding, isFullyPickedUp } from "@/lib/pickup";
import Link from "next/link";
import { notFound } from "next/navigation";

// Guest order status. The token in the URL is the credential — there's no
// login to gate on with guest checkout, so it's a 24-byte random secret that
// only ever appears in the customer's own email.
export const dynamic = "force-dynamic";

// Don't let this page get indexed or shared into a crawler's cache.
export const metadata = { robots: { index: false, follow: false } };

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

const STATUS_COPY: Record<string, { label: string; blurb: string }> = {
  PENDING_PAYMENT: {
    label: "Awaiting payment",
    blurb: "We haven't seen payment for this order yet. If you just checked out, give it a minute and refresh.",
  },
  PAID: {
    label: "Paid — in production",
    blurb: "Your sticks are on the next batch. We'll email you the moment they land in St. Louis.",
  },
  READY_FOR_PICKUP: {
    label: "Ready for pickup",
    blurb: "They're here. Come grab them any time during the pickup window.",
  },
  PICKED_UP: {
    label: "Picked up",
    blurb: "All set — thanks for the order.",
  },
  CANCELLED: { label: "Cancelled", blurb: "This order was cancelled." },
  REFUNDED: { label: "Refunded", blurb: "This order was refunded." },
};

export default async function OrderStatusPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!token || token.length < 16) notFound();

  const order = await prisma.order.findUnique({
    where: { lookupToken: token },
    include: {
      batch: { select: { name: true, pickupStart: true, pickupEnd: true, status: true } },
      items: { include: { product: { select: { name: true } } } },
      pickupEvents: {
        orderBy: { createdAt: "desc" },
        include: { lines: { select: { qty: true } } },
      },
    },
  });
  if (!order) notFound();

  const outstanding = order.items.reduce((s, it) => s + lineOutstanding(it), 0);
  const collected = isFullyPickedUp(order.items);
  const copy = STATUS_COPY[order.status] ?? { label: order.status, blurb: "" };
  const address =
    process.env.NEXT_PUBLIC_PICKUP_ADDRESS ??
    "St. Louis, MO (exact address emailed with pickup confirmation)";
  const partial = outstanding > 0 && order.items.some((it) => it.qtyPickedUp > 0);

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-black">Your order</h1>
      <p className="mt-1 text-sm text-black/50">
        Placed {fmtDate(order.createdAt)} · #{order.id.slice(0, 8).toUpperCase()}
      </p>

      <div className="mt-6 rounded-2xl border border-black/10 bg-white p-6">
        <span className="rounded-full bg-volt/30 px-3 py-1 text-xs font-bold uppercase">
          {copy.label}
        </span>
        <p className="mt-3 text-black/70">{copy.blurb}</p>

        {partial && (
          <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
            You&apos;ve picked up part of this order. <strong>{outstanding}</strong>{" "}
            {outstanding === 1 ? "stick is" : "sticks are"} still waiting for you.
          </p>
        )}

        <ul className="mt-5 space-y-2 text-sm">
          {order.items.map((it) => {
            const left = lineOutstanding(it);
            return (
              <li key={it.id} className="flex items-start justify-between gap-4">
                <span>
                  {it.quantity}× {it.product?.name ?? "Stick"}
                  {it.options ? (
                    <span className="block text-xs text-black/50">
                      {optionsSummary(it.options as SelectedOptions)}
                    </span>
                  ) : null}
                </span>
                <span className="whitespace-nowrap text-right">
                  <span className="font-bold">{fmtPrice(it.priceCents * it.quantity)}</span>
                  <span className="block text-xs text-black/50">
                    {left === 0
                      ? "picked up"
                      : it.qtyPickedUp > 0
                        ? `${left} of ${it.quantity} left`
                        : "awaiting pickup"}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>

        <div className="mt-5 flex items-center justify-between border-t border-black/10 pt-4">
          <span className="text-sm text-black/50">
            {order.batch ? order.batch.name : "From stock"}
          </span>
          <span className="text-lg font-black">{fmtPrice(order.subtotalCents)}</span>
        </div>
      </div>

      {!collected && order.status !== "CANCELLED" && order.status !== "REFUNDED" && (
        <div className="mt-6 rounded-2xl border border-black/10 bg-white p-6">
          <h2 className="font-black">Pickup</h2>
          <p className="mt-2 text-sm text-black/70">{address}</p>
          {order.batch && (
            <p className="mt-2 text-sm text-black/70">
              {order.status === "READY_FOR_PICKUP" ? "Pickup window" : "Estimated pickup"}:{" "}
              <strong>
                {fmtDate(order.batch.pickupStart)} – {fmtDate(order.batch.pickupEnd)}
              </strong>
            </p>
          )}
          <p className="mt-3 text-sm text-black/50">
            Someone else picking up for you? That&apos;s fine — just{" "}
            <Link href="/contact" className="underline">
              let us know
            </Link>{" "}
            who to expect.
          </p>
        </div>
      )}

      {order.pickupEvents.length > 0 && (
        <div className="mt-6 rounded-2xl border border-black/10 bg-white p-6">
          <h2 className="font-black">Pickup history</h2>
          <ul className="mt-3 space-y-2 text-sm text-black/70">
            {order.pickupEvents.map((e) => {
              const units = e.lines.reduce((s, l) => s + l.qty, 0);
              return (
                <li key={e.id}>
                  {fmtDate(e.createdAt)} — {units > 0 ? `${units} picked up` : "correction"} by{" "}
                  {e.pickedUpBy}
                  {e.note ? ` (${e.note})` : ""}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="mt-8 flex flex-wrap gap-3 text-sm">
        <Link href="/sticks" className="rounded-full bg-ink px-5 py-2 font-bold text-paper hover:bg-ink/80">
          Shop sticks
        </Link>
        <Link href="/warranty" className="rounded-full border border-black/20 px-5 py-2 font-bold hover:bg-black/5">
          Warranty claim
        </Link>
        <Link href="/contact" className="rounded-full border border-black/20 px-5 py-2 font-bold hover:bg-black/5">
          Contact us
        </Link>
      </div>
    </div>
  );
}
