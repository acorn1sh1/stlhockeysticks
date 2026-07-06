import { fmtPrice, optionsSummary, type SelectedOptions } from "@/lib/catalog";
import { prisma } from "@/lib/db";
import Link from "next/link";

export const dynamic = "force-dynamic";

const clerkEnabled = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export default async function AccountPage() {
  if (!clerkEnabled) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <h1 className="text-3xl font-black">Accounts coming soon</h1>
        <p className="mt-3 text-black/60">
          Guest checkout works great in the meantime — order confirmations and
          pickup notices go straight to your email.
        </p>
        <Link href="/sticks" className="mt-8 inline-block rounded-full bg-ink px-7 py-3 font-bold text-paper hover:bg-ink/80">
          Shop Sticks →
        </Link>
      </div>
    );
  }

  const { currentUser } = await import("@clerk/nextjs/server");
  const user = await currentUser();

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <h1 className="text-3xl font-black">Sign in to see your orders</h1>
        <p className="mt-3 text-black/60">
          Or keep using guest checkout — no account required.
        </p>
      </div>
    );
  }

  const email = user.emailAddresses[0]?.emailAddress;
  const orders = await prisma.order.findMany({
    where: { OR: [{ clerkUserId: user.id }, ...(email ? [{ email }] : [])] },
    include: { items: { include: { product: true } }, batch: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-3xl font-black">Your Orders</h1>
      {orders.length === 0 && (
        <p className="mt-4 text-black/60">No orders yet.</p>
      )}
      <div className="mt-6 space-y-4">
        {orders.map((o) => (
          <div key={o.id} className="rounded-2xl border border-black/10 bg-white p-5">
            <div className="flex items-center justify-between">
              <div className="font-bold">
                {o.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </div>
              <span className="rounded-full bg-volt/30 px-3 py-1 text-xs font-bold">
                {o.status.replaceAll("_", " ")}
              </span>
            </div>
            <ul className="mt-3 space-y-1 text-sm text-black/70">
              {o.items.map((it) => (
                <li key={it.id}>
                  {it.quantity}× {it.product.name}
                  {it.options
                    ? ` (${optionsSummary(it.options as SelectedOptions)})`
                    : ""}{" "}
                  — {fmtPrice(it.priceCents * it.quantity)}
                </li>
              ))}
            </ul>
            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="text-black/50">
                {o.batch ? `Batch: ${o.batch.name}` : "Fulfilled from stock"}
                {o.discountCents > 0 && " · 10% team donation applied"}
              </span>
              <span className="font-black">{fmtPrice(o.subtotalCents)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
