"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/lib/cart";
import { clubDiscountCents, fmtPrice, nextBatch, optionsSummary } from "@/lib/catalog";

export default function CartPage() {
  const { lines, setQty, remove, subtotalCents } = useCart();
  const discountCents = clubDiscountCents(lines);
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [state, setState] = useState<"idle" | "sending" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function checkout() {
    setState("sending");
    setErrorMsg("");
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        lines: lines.map((l) => ({
          slug: l.slug,
          quantity: l.quantity,
          options: l.options,
        })),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.url) {
      window.location.href = data.url; // off to Clover hosted checkout
    } else {
      setState("error");
      setErrorMsg(data.error ?? "Checkout failed. Try again.");
    }
  }

  if (lines.length === 0)
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <h1 className="text-3xl font-black">Your cart is empty</h1>
        <p className="mt-2 text-black/60">Time to fix that.</p>
        <Link
          href="/sticks"
          className="mt-6 inline-block rounded-full bg-ink px-7 py-3 font-bold text-paper hover:bg-ink/80"
        >
          Shop Sticks →
        </Link>
      </div>
    );

  const batch = nextBatch();
  const valid = form.name.trim() && /\S+@\S+\.\S+/.test(form.email);

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-3xl font-black">Cart</h1>

      <div className="mt-6 divide-y divide-black/10 rounded-2xl border border-black/10 bg-white">
        {lines.map((l) => (
          <div key={l.key} className="flex items-center gap-4 p-4">
            <div className="flex-1">
              <div className="font-bold">{l.name}</div>
              {l.options && (
                <div className="text-xs font-semibold text-volt-dark">
                  {optionsSummary(l.options)}
                </div>
              )}
              <div className="text-sm text-black/50">{fmtPrice(l.priceCents)} each</div>
            </div>
            <div className="flex items-center gap-2">
              <button
                aria-label="Decrease quantity"
                onClick={() => setQty(l.key, l.quantity - 1)}
                className="h-8 w-8 rounded-full border border-black/20 font-bold hover:bg-black/5"
              >
                −
              </button>
              <span className="w-8 text-center font-bold">{l.quantity}</span>
              <button
                aria-label="Increase quantity"
                onClick={() => setQty(l.key, l.quantity + 1)}
                className="h-8 w-8 rounded-full border border-black/20 font-bold hover:bg-black/5"
              >
                +
              </button>
            </div>
            <div className="w-20 text-right font-black">
              {fmtPrice(l.priceCents * l.quantity)}
            </div>
            <button
              onClick={() => remove(l.key)}
              className="text-sm text-black/40 hover:text-red-600"
              aria-label={`Remove ${l.name}`}
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-xl bg-volt/20 p-4 text-sm">
        <strong>Local pickup — free.</strong> Custom sticks arrive with the
        monthly batch (pickup around{" "}
        {batch.pickupStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        ). We&apos;ll email you when your order is ready.
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <div className="space-y-3">
          <h2 className="font-black">Pickup contact</h2>
          <input
            aria-label="Full name"
            placeholder="Full name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full rounded-lg border border-black/20 px-3 py-2"
          />
          <input
            aria-label="Email"
            placeholder="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full rounded-lg border border-black/20 px-3 py-2"
          />
          <input
            aria-label="Phone (optional)"
            placeholder="Phone (optional)"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="w-full rounded-lg border border-black/20 px-3 py-2"
          />
        </div>
        <div className="flex flex-col justify-end">
          <div className="flex justify-between text-lg">
            <span className="font-bold">Subtotal</span>
            <span className="font-black">{fmtPrice(subtotalCents)}</span>
          </div>
          {discountCents > 0 && (
            <div className="mt-1 flex justify-between text-sm font-semibold text-volt-dark">
              <span>10% Team Donation Discount (20+ club sticks)</span>
              <span>−{fmtPrice(discountCents)}</span>
            </div>
          )}
          {discountCents > 0 && (
            <div className="mt-1 flex justify-between text-lg">
              <span className="font-bold">Total</span>
              <span className="font-black">{fmtPrice(subtotalCents - discountCents)}</span>
            </div>
          )}
          <p className="mt-1 text-right text-xs text-black/50">
            Tax handled at payment. No shipping — ever.
          </p>
          <button
            onClick={checkout}
            disabled={!valid || state === "sending"}
            className="mt-4 rounded-full bg-ink py-3 font-bold text-paper hover:bg-ink/80 disabled:opacity-40"
          >
            {state === "sending" ? "Redirecting to secure checkout..." : "Pay with Clover →"}
          </button>
          {state === "error" && (
            <p className="mt-2 text-sm text-red-600">{errorMsg}</p>
          )}
          <p className="mt-2 text-center text-xs text-black/50">
            Secure payment by Clover. Card details never touch our servers.
          </p>
        </div>
      </div>
    </div>
  );
}
